import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/api/student-session";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";
import { buildMatriculaHtml } from "@/lib/matricula-form/build-matricula-html";
import { FORMULARIO_MATRICULA_DOC_KEY, FORMULARIO_MATRICULA_LABEL } from "@/lib/matricula-form/constants";
import { fetchLogoDataUrl } from "@/lib/matricula-form/fetch-logo-data-url";
import { rowToMatriculaPrefill } from "@/lib/matricula-form/map-row-to-matricula";
import { renderHtmlToPdfBuffer } from "@/lib/matricula-form/render-html-to-pdf";
import {
  computePendencias,
  getAlunosTableName,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import { b2ObjectKeyForDoc, tableValueAfterUpload } from "@/lib/proeduka-doc-b2";
import { ensureRegistroEscolarParaEmAnalise } from "@/lib/api/ensure-registro-escolar-em-analise";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";
import { quotePgColumnIdentifier } from "@/lib/db/quote-pg-col";
import { dispatchDataUpdatedWebhook } from "@/lib/webhooks/dispatch";
import { BRASILIA_TIMEZONE } from "@/lib/format-br";

export const runtime = "nodejs";
export const maxDuration = 120;

function normalizeSigB64(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("data:image")) {
    const i = t.indexOf("base64,");
    if (i !== -1) return t.slice(i + 7).trim();
  }
  return t;
}

function brazilSignDateParts(): { day: string; month: string; year: string } {
  const s = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const parts = s.split("/").map((x) => x.trim());
  const day = parts[0] ?? "";
  const month = parts[1] ?? "";
  const year = parts[2] ?? "";
  return { day, month, year };
}

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isB2Configured()) {
    return NextResponse.json(
      { error: "Armazenamento não configurado." },
      { status: 503 },
    );
  }

  let body: {
    signaturePngBase64?: unknown;
    acceptDeclaration?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.acceptDeclaration !== true) {
    return NextResponse.json(
      { error: "É necessário aceitar a declaração e assinar o formulário." },
      { status: 400 },
    );
  }

  const sigRaw =
    typeof body.signaturePngBase64 === "string"
      ? body.signaturePngBase64
      : "";
  const sigB64 = normalizeSigB64(sigRaw);
  if (sigB64.length < 80) {
    return NextResponse.json(
      { error: "Assinatura inválida ou vazia. Desenhe no quadro e tente novamente." },
      { status: 400 },
    );
  }
  if (sigB64.length > 2_500_000) {
    return NextResponse.json(
      { error: "Assinatura muito grande. Limpe o quadro e assine novamente." },
      { status: 400 },
    );
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  const studentId = session.studentId;
  void getAlunosTableName();
  const fq = alunosFqn();
  let row: Record<string, unknown>;
  try {
    const hits =
      await service.unsafe<Array<Record<string, unknown>>>(`
        SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1
      `,
      [studentId],
    );
    const hit = hits[0];
    if (!hit) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }
    row = hit;
  } catch {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const rec = row as Record<string, unknown>;
  const docKey = FORMULARIO_MATRICULA_DOC_KEY;
  if (isTruthyFlag(rec[docKey])) {
    return NextResponse.json(
      { error: "Este formulário já foi assinado e registrado." },
      { status: 400 },
    );
  }

  const pend = computePendencias(rec);
  if (pend.informacoes.length > 0) {
    return NextResponse.json(
      {
        error:
          "Complete todos os dados cadastrais obrigatórios antes de assinar o formulário de matrícula.",
      },
      { status: 400 },
    );
  }

  const isoStamp = new Date().toISOString();
  const hash = createHash("sha256")
    .update(`${studentId}|${isoStamp}|${sigB64}`)
    .digest("hex");
  const brHuman = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIMEZONE,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
  const auditLine = `Identificador SHA-256: ${hash} — Registro: ${brHuman} (America/Sao_Paulo) — ProEduka.`;

  const prefill = rowToMatriculaPrefill(rec);
  const { day, month, year } = brazilSignDateParts();
  const logoDataUrl = await fetchLogoDataUrl();
  const signatureDataUrl = `data:image/png;base64,${sigB64}`;

  const html = buildMatriculaHtml({
    prefill,
    signatureDataUrl,
    logoDataUrl,
    signDay: day,
    signMonth: month,
    signYear: year,
    auditLine,
  });

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderHtmlToPdfBuffer(html);
  } catch (e) {
    console.error("[matricula-assinar] PDF", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Não foi possível gerar o PDF. Verifique CHROMIUM_PATH / Chrome no servidor.",
      },
      { status: 500 },
    );
  }

  const fileKey = b2ObjectKeyForDoc(studentId, docKey, "pdf");

  try {
    const client = getB2S3Client();
    const bucket = getB2BucketName();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      }),
    );
  } catch (e) {
    console.error("[matricula-assinar] B2", e);
    return NextResponse.json(
      { error: "Falha ao enviar o PDF ao armazenamento." },
      { status: 500 },
    );
  }

  const val = tableValueAfterUpload();
  try {
    const up =
      await service.unsafe<Array<{ id?: string | null }>>(`
        UPDATE ${fq}
        SET ${quotePgColumnIdentifier(docKey)} = $1
        WHERE id::text = $2
        RETURNING id::text
      `,
      [val, studentId],
    );
    if (!up?.length)
      throw new Error("Erro ao atualizar cadastro.");
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Erro ao atualizar cadastro.",
      },
      { status: 500 },
    );
  }

  const regEnsure = await ensureRegistroEscolarParaEmAnalise(
    service,
    studentId,
  );
  if (!regEnsure.ok) {
    console.error("[matricula-assinar] registo escolar:", regEnsure.error);
  }

  const nome = String(rec.nome ?? "").trim();
  const email = String(rec.email ?? "").trim();
  try {
    await dispatchDataUpdatedWebhook({
      studentId,
      name: nome || email,
      email: email || nome,
      fileKey,
      label: FORMULARIO_MATRICULA_LABEL,
    });
  } catch (e) {
    console.error("[matricula-assinar] webhook", e);
  }

  return NextResponse.json({ ok: true, fileKey });
}
