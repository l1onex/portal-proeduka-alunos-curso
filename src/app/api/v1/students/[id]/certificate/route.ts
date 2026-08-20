import { NextResponse } from "next/server";
import { issueCertificateForStudent } from "@/lib/certificate/issue-for-student";
import { requireApiKey } from "@/lib/api/verify-api-key";
import { getAlunosTableName } from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  void getAlunosTableName();
  const fq = alunosFqn();

  let row:
    | {
        codigo_validacao?: string | null;
        qr_certificado_url?: string | null;
      }
    | undefined;

  try {
    const hits = await sql.unsafe<
      Array<{
        codigo_validacao?: string | null;
        qr_certificado_url?: string | null;
      }>
    >(
      `
      SELECT codigo_validacao, qr_certificado_url
      FROM ${fq}
      WHERE id::text = $1
      LIMIT 1
      `,
      [studentId.trim()],
    );
    row = hits[0];
  } catch {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!row) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const codigo = row.codigo_validacao;
  const qr = row.qr_certificado_url;
  const hasC = typeof codigo === "string" && codigo.trim().length > 0;
  const hasQ = typeof qr === "string" && qr.trim().length > 0;

  if (hasC && hasQ) {
    return NextResponse.json(
      {
        error:
          "Este aluno já possui código e QR de validação. Não é necessário gerar de novo.",
      },
      { status: 409 },
    );
  }

  try {
    await issueCertificateForStudent(sql, studentId);
  } catch (e) {
    console.error("issueCertificateForStudent (api v1):", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Falha ao gerar código ou QR do validador.",
      },
      { status: 500 },
    );
  }

  const outs = await sql.unsafe<
    Array<{
      codigo_validacao?: string | null;
      qr_certificado_url?: string | null;
    }>
  >(
    `
      SELECT codigo_validacao, qr_certificado_url
      FROM ${fq}
      WHERE id::text = $1
      LIMIT 1`,
    [studentId.trim()],
  );

  const out = outs[0];

  return NextResponse.json({
    ok: true,
    codigo_validacao: out?.codigo_validacao ?? null,
    qr_certificado_url: out?.qr_certificado_url ?? null,
  });
}
