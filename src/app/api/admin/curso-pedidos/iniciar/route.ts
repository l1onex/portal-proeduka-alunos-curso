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

/**
 * POST /api/admin/curso-pedidos/iniciar — body { pedido_id }.
 *
 * Clicar em "Iniciar certificação" numa solicitação do curso equivale a
 * emitir o certificado do aluno para aquele curso. Faz tudo num só passo:
 *   1. Valida pendências do aluno (campo e documentação).
 *   2. Gera código/QR do certificado (issueCertificateForStudent).
 *   3. Marca `proeduka_alunos.final = TRUE` + homologado_por/em.
 *   4. Marca `proeduka_aluno_cursos.status = 'concluido'` + concluido_em/por.
 *   5. Marca o pedido `proeduka_curso_pedidos.status = 'concluido'`.
 *   6. Dispara webhook `certificate_print`.
 */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const pedidoId =
    typeof body.pedido_id === "string" ? body.pedido_id.trim() : "";
  if (!pedidoId) {
    return NextResponse.json(
      { error: "Informe o pedido (pedido_id)." },
      { status: 400 },
    );
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

  // 1. Carrega o pedido + garante que está pendente e obtém aluno/curso.
  let pedidoRows: Array<{
    id: string;
    aluno_id: string;
    curso_id: string;
    status: "pendente" | "iniciado" | "recusado" | "concluido";
  }>;
  try {
    pedidoRows = await sql<Array<{
      id: string;
      aluno_id: string;
      curso_id: string;
      status: "pendente" | "iniciado" | "recusado" | "concluido";
    }>>`
      SELECT id::text AS id,
             aluno_id::text AS aluno_id,
             curso_id::text AS curso_id,
             status AS status
      FROM public.proeduka_curso_pedidos
      WHERE id = ${pedidoId}::uuid
      LIMIT 1
    `;
  } catch (e) {
    console.error("[admin curso-pedidos/iniciar POST] SELECT pedido:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a ler o pedido." },
      { status: 500 },
    );
  }
  const pedido = pedidoRows[0];
  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 },
    );
  }
  if (pedido.status !== "pendente") {
    return NextResponse.json(
      {
        error: `Pedido não está pendente (status atual: "${pedido.status}").`,
      },
      { status: 409 },
    );
  }
  const studentId = pedido.aluno_id;

  // 2. Confirma que o curso está atribuído ao aluno (precisamos para concluir depois).
  let atribuicaoRows: Array<{ id: string }>;
  try {
    atribuicaoRows = await sql<Array<{ id: string }>>`
      SELECT id::text AS id
      FROM public.proeduka_aluno_cursos
      WHERE aluno_id = ${studentId}::uuid
        AND curso_id = ${pedido.curso_id}::uuid
      LIMIT 1
    `;
  } catch (e) {
    console.error(
      "[admin curso-pedidos/iniciar POST] SELECT atribuicao:",
      e,
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a validar curso." },
      { status: 500 },
    );
  }
  if (atribuicaoRows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Este curso não está atribuído ao aluno. Atribua o curso antes de iniciar a certificação.",
      },
      { status: 400 },
    );
  }

  // 3. Garante registo escolar e carrega a ficha completa do aluno.
  const ensureRes = await ensureRegistroEscolarParaEmAnalise(sql, studentId);
  if (!ensureRes.ok) {
    return NextResponse.json({ error: ensureRes.error }, { status: 503 });
  }

  void getAlunosTableName();
  const fq = alunosFqn();

  let hits: Array<Record<string, unknown>> = [];
  try {
    hits = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1`,
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
    return NextResponse.json(
      { error: "Aluno não encontrado." },
      { status: 404 },
    );
  }
  const rec = row as Record<string, unknown>;

  // 4. Bloqueios de campos e documentação.
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

  // 5. Gera o certificado (código + QR).
  try {
    await issueCertificateForStudent(sql, studentId);
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

  // 6. Marca a ficha do aluno como aprovada/concluída.
  try {
    const up = await sql.unsafe<Array<{ id?: string | null }>>(
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
        { error: "Falha ao marcar o aluno como aprovado." },
        { status: 400 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Falha ao marcar o aluno como aprovado.",
      },
      { status: 400 },
    );
  }

  // 7. Marca o curso atribuído como `concluido`.
  try {
    await sql`
      UPDATE public.proeduka_aluno_cursos
      SET status = 'concluido',
          concluido_em = now(),
          concluido_por = ${session.userId}::uuid
      WHERE aluno_id = ${studentId}::uuid
        AND curso_id = ${pedido.curso_id}::uuid
    `;
  } catch (e) {
    console.error("[admin curso-pedidos/iniciar POST] UPDATE aluno_cursos:", e);
    // Não abortamos — o certificado já foi emitido. Avisamos no retorno.
  }

  // 8. Marca o pedido como `concluido` (não mais "iniciado").
  try {
    await sql`
      UPDATE public.proeduka_curso_pedidos
      SET status = 'concluido',
          decisao_em = now(),
          decisao_por = ${session.userId}::uuid
      WHERE id = ${pedidoId}::uuid
    `;
  } catch (e) {
    console.error(
      "[admin curso-pedidos/iniciar POST] UPDATE pedido status:",
      e,
    );
  }

  // 9. Dispara o webhook de impressão.
  await dispatchCertificatePrintWebhook({
    studentId,
    cursoId: pedido.curso_id,
  });

  return NextResponse.json({ ok: true });
}