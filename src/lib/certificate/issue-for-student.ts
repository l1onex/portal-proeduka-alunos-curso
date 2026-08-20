import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";
import { alunosFqn } from "@/lib/db/alunos-table";
import type { Sql } from "@/lib/db/client";
import {
  buildPublicValidatorUrl,
  buildQrImagePublicUrl,
} from "@/lib/certificate/public-url";

const QR_KEY = (studentId: string) => `students/${studentId}/qr-certificado.png`;

async function uploadQrAndResolveUrl(
  studentId: string,
  validatorUrl: string,
): Promise<string | null> {
  if (!isB2Configured()) return null;

  const png = await QRCode.toBuffer(validatorUrl, {
    type: "png",
    width: 320,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const key = QR_KEY(studentId);
  const client = getB2S3Client();
  const bucket = getB2BucketName();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: png,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000",
    }),
  );

  return buildQrImagePublicUrl(studentId);
}

async function ensureQrUrlIfNeeded(
  service: Sql,
  studentId: string,
  codigo: string,
): Promise<void> {
  const fq = alunosFqn();
  const rows = await service.unsafe<Array<{ qr_certificado_url?: string | null }>>(
    `SELECT qr_certificado_url FROM ${fq} WHERE id::text = $1 LIMIT 1`,
    [studentId],
  );
  const qr = rows[0]?.qr_certificado_url;
  if (typeof qr === "string" && qr.trim().length > 0) return;

  const validatorUrl = buildPublicValidatorUrl(codigo);
  const qrUrl = await uploadQrAndResolveUrl(studentId, validatorUrl);
  if (!qrUrl) return;

  await service.unsafe(
    `UPDATE ${fq} SET qr_certificado_url = $1 WHERE id::text = $2`,
    [qrUrl, studentId],
  );
}

/**
 * Gera código de validação + QR no B2. Número de registo, livro e página vêm do registo escolar
 * (atribuído quando o cadastro passa a em análise; o admin pode ajustar nos dados do aluno).
 */
export async function issueCertificateForStudent(
  service: Sql,
  studentId: string,
): Promise<void> {
  const fq = alunosFqn();

  const rows = await service.unsafe<Array<{ codigo_validacao?: string | null }>>(
    `SELECT codigo_validacao FROM ${fq} WHERE id::text = $1 LIMIT 1`,
    [studentId],
  );
  const prev = rows[0]?.codigo_validacao;
  if (typeof prev === "string" && prev.trim().length > 0) {
    await ensureQrUrlIfNeeded(service, studentId, prev.trim());
    return;
  }

  let codigo = "";
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = nanoid(16);
    const clash = await service.unsafe<Array<{ id: string | null }>>(
      `SELECT id::text AS id FROM ${fq} WHERE codigo_validacao::text = $1 LIMIT 1`,
      [candidate],
    );
    if (!clash[0]?.id) {
      codigo = candidate;
      break;
    }
  }
  if (!codigo) {
    throw new Error("Não foi possível gerar código de validação único.");
  }

  const validatorUrl = buildPublicValidatorUrl(codigo);
  const qrUrl = await uploadQrAndResolveUrl(studentId, validatorUrl);

  const out = await service.unsafe<Array<{ ok: boolean }>>(
    `UPDATE ${fq} SET codigo_validacao = $1, qr_certificado_url = $2 WHERE id::text = $3 RETURNING true AS ok`,
    [codigo, qrUrl ?? null, studentId],
  );
  if (!out.length) throw new Error("Falha ao gravar código de validação.");
}
