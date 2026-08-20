import { NextResponse } from "next/server";
import { getCertificationBlockers } from "@/lib/aluno-cert-requirements";
import {
  COLUNA_HOMOLOGADO_EM,
  COLUNA_HOMOLOGADO_POR,
  docKeysForRow,
  getAlunosTableName,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import { issueCertificateForStudent } from "@/lib/certificate/issue-for-student";
import { getStaffSession } from "@/lib/api/staff-session";
import { dispatchCertificatePrintWebhook } from "@/lib/webhooks/dispatch";
import { ensureRegistroEscolarParaEmAnalise } from "@/lib/api/ensure-registro-escolar-em-analise";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin: documentação completa → aprova (`final`) + emite certificado se faltar + webhook `certificate_print`.
 * Não exige mais `field_review` — basta o aluno não ter pendências (campos e documentação).
 */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  // Aceita (e ignora) corpo JSON — a rota costumava exigir `field_review`.
  try {
    await request.json().catch(() => null);
  } catch {
    /* body opcional */
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

  void getAlunosTableName();
  const fq = alunosFqn();
  const ensureRes = await ensureRegistroEscolarParaEmAnalise(service, studentId);
  if (!ensureRes.ok) {
    return NextResponse.json({ error: ensureRes.error }, { status: 503 });
  }

  let hits: Record<string, unknown>[] = [];
  try {
    hits =
      await service.unsafe<Array<Record<string, unknown>>>(`
        SELECT *
        FROM ${fq}
        WHERE id::text = $1
        LIMIT 1
      `,
      [studentId.trim()],
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Falha ao carregar dados do aluno.",
      },
      { status: 400 },
    );
  }

  const row = hits[0];
  if (!row) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const rec = row as Record<string, unknown>;

  const blockers = getCertificationBlockers(rec);
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: `Preencha todos os campos obrigatórios antes de emitir o certificado: ${blockers.join("; ")}.`,
      },
      { status: 400 },
    );
  }

  for (const docKey of docKeysForRow(rec)) {
    if (!isTruthyFlag(rec[docKey])) {
      return NextResponse.json(
        {
          error:
            "Ainda há documentação pendente. Só é possível iniciar o certificado quando todos os documentos estiverem enviados.",
        },
        { status: 400 },
      );
    }
  }

  if (isTruthyFlag(rec.final)) {
    return NextResponse.json(
      {
        error:
          "Este aluno já está marcado como aprovado/concluído. Não é possível repetir o fluxo.",
      },
      { status: 400 },
    );
  }

  try {
    await issueCertificateForStudent(service, studentId);
  } catch (e) {
    console.error("issueCertificateForStudent:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Falha ao gerar código ou QR do certificado.",
      },
      { status: 500 },
    );
  }

  const iso = new Date().toISOString();
  try {
    const up = await service.unsafe<Array<{ id?: string | null }>>(
      `
      UPDATE ${fq}
      SET final = TRUE,
          "${COLUNA_HOMOLOGADO_EM}" = $1::timestamptz,
          "${COLUNA_HOMOLOGADO_POR}" = $2::uuid
      WHERE id::text = $3
      RETURNING id::text
      `,
      [iso, session.userId, studentId.trim()],
    );
    if (!up?.length) {
      return NextResponse.json(
        { error: "Falha ao marcar como aprovado." },
        { status: 400 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Falha ao marcar como aprovado.",
      },
      { status: 400 },
    );
  }

  await dispatchCertificatePrintWebhook({
    studentId,
    cursoId: null,
  });

  return NextResponse.json({ ok: true });
}
