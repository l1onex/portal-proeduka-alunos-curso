import { NextResponse } from "next/server";
import { insertCertificadoSolicitadoNotification } from "@/lib/admin/staff-notifications";
import {
  ensureRegistroEscolarParaEmAnalise,
  type EnsureRegistroEscolarResult,
} from "@/lib/api/ensure-registro-escolar-em-analise";
import { getStudentSession } from "@/lib/api/student-session";
import {
  COLUNA_CERTIFICADO_SOLICITADO_EM,
  computePendencias,
  getAlunosTableName,
  isCertificadoSolicitado,
  isDesistente,
  isInadimplente,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";
import { dispatchCertificateRequestedWebhook } from "@/lib/webhooks/dispatch";

export const runtime = "nodejs";

/**
 * Aluno: conclui o fluxo “Solicitar certificado” (documentos e provas confirmadas no cliente).
 * Grava `certificado_solicitado_em`, gera registo escolar se aplicável e notifica a equipa.
 */
export async function POST() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
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
  let rec: Record<string, unknown>;
  try {
    const hits =
      await service.unsafe<Array<Record<string, unknown>>>(`
        SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1
      `,
      [session.studentId],
    );
    const row = hits[0];
    if (!row)
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    rec = row;
  } catch {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (isDesistente(rec) || isInadimplente(rec)) {
    return NextResponse.json(
      { error: "Não é possível solicitar o certificado nesta situação." },
      { status: 400 },
    );
  }

  if (isTruthyFlag(rec.final)) {
    return NextResponse.json(
      { error: "O seu certificado já foi aprovado." },
      { status: 400 },
    );
  }

  if (isCertificadoSolicitado(rec)) {
    return NextResponse.json(
      { error: "Já enviou o pedido de certificado." },
      { status: 400 },
    );
  }

  const pend = computePendencias(rec);
  if (pend.totalCount > 0) {
    return NextResponse.json(
      {
        error:
          "Ainda há pendências no cadastro. Conclua documentos e dados antes de solicitar.",
      },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();

  let ensureRegistro: EnsureRegistroEscolarResult = {
    ok: true,
    assigned: false,
  };

  try {
    /**
     * O pedido do certificado grava sempre `certificado_solicitado_em`.
     * O registo (`next_registro_escolar`) corre a seguir, com merge do timestamp neste mesmo
     * pedido para não depender da próxima conexão do pool já ver o `UPDATE` (caso contrário o
     * estado ficava «aguardando solicitação» e livro/registo/página ficavam vazios).
     */
    const up =
      await service.unsafe<Array<{ id?: string | null }>>(`
        UPDATE ${fq}
        SET "${COLUNA_CERTIFICADO_SOLICITADO_EM}" = $1::timestamptz
        WHERE id::text = $2
        RETURNING id::text
      `,
      [nowIso, session.studentId],
      );
    if (!up?.length) {
      return NextResponse.json(
        { error: "Falha ao registar o pedido." },
        { status: 400 },
      );
    }

    ensureRegistro = await ensureRegistroEscolarParaEmAnalise(service, session.studentId, {
      rowOverrides: { [COLUNA_CERTIFICADO_SOLICITADO_EM]: nowIso },
    });

    if (ensureRegistro.ok && !ensureRegistro.assigned) {
      await new Promise((r) => setTimeout(r, 150));
      ensureRegistro = await ensureRegistroEscolarParaEmAnalise(service, session.studentId, {
        rowOverrides: { [COLUNA_CERTIFICADO_SOLICITADO_EM]: nowIso },
      });
    }

    if (!ensureRegistro.ok) {
      console.error("[solicitar-certificado] registo escolar:", ensureRegistro.error);
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Falha ao registar o pedido.",
      },
      { status: 400 },
    );
  }

  await dispatchCertificateRequestedWebhook({
    studentId: session.studentId,
    requestedAtIso: nowIso,
    cursoId: null,
  });

  const nome =
    typeof rec.nome === "string" && rec.nome.trim()
      ? rec.nome.trim()
      : session.email ?? "Aluno";

  const notif = await insertCertificadoSolicitadoNotification(service, {
    studentId: session.studentId,
    studentName: nome,
  });
  if (!notif.ok) {
    console.error("[solicitar-certificado] notificação:", notif.error);
  }

  return NextResponse.json({
    ok: true,
    certificado_solicitado_em: nowIso,
    ...(ensureRegistro.ok &&
    ensureRegistro.assigned && {
      numero_registro: ensureRegistro.value.numero_registro,
      livro: ensureRegistro.value.livro,
      pagina: ensureRegistro.value.pagina,
    }),
  });
}
