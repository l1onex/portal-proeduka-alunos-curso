import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { aprovarCursoSolicitacao } from "@/lib/api/curso-solicitacoes";
import { getSql } from "@/lib/db/client";
import { insertStaffNotification } from "@/lib/admin/staff-notifications";
import { dispatchCourseApprovedWebhook } from "@/lib/webhooks/course-dispatch";

/**
 * POST /api/admin/curso-solicitacoes/aprovar
 * Body: { solicitacao_id: string }
 *
 * Aprova um pedido de curso: atribui o curso ao aluno e notifica
 * a campaninha (com mensagem de aprovação).
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
  const solicitacaoId =
    typeof body.solicitacao_id === "string"
      ? body.solicitacao_id.trim()
      : "";
  if (!solicitacaoId) {
    return NextResponse.json(
      { error: "Informe o pedido (solicitacao_id)." },
      { status: 400 },
    );
  }

  try {
    const row = await aprovarCursoSolicitacao({
      solicitacaoId,
      decididoPor: session.userId,
    });

    // Notificação admin (para deixar histórico na campaninha).
    try {
      const sql = getSql();
      const info = await sql<
        Array<{ aluno_nome: string | null; curso_nome: string | null }>
      >`
        SELECT a.nome AS aluno_nome, c.nome AS curso_nome
        FROM public.proeduka_curso_solicitacoes s
        LEFT JOIN public.proeduka_alunos a ON a.id = s.aluno_id
        LEFT JOIN public.proeduka_cursos  c ON c.id = s.curso_id
        WHERE s.id = ${solicitacaoId}::uuid
        LIMIT 1
      `;
      const alunoNome = info[0]?.aluno_nome?.trim() || "Aluno";
      const cursoNome = info[0]?.curso_nome?.trim() || "?";
      await insertStaffNotification(sql, {
        kind: "curso_liberado",
        studentId: row.aluno_id,
        studentName: alunoNome,
        body: `Curso "${cursoNome}" liberado para ${alunoNome}.`,
        metadata: {
          solicitacao_id: solicitacaoId,
          curso_id: row.curso_id,
          decidido_por: session.userId,
        },
      });
    } catch (notifErr) {
      console.error(
        "[admin curso-solicitacoes/aprovar POST] notificação:",
        notifErr,
      );
    }

    // Webhook `course_approved` (não bloqueia o fluxo).
    void dispatchCourseApprovedWebhook({
      studentId: row.aluno_id,
      cursoId: row.curso_id,
      approvedAtIso: new Date().toISOString(),
    }).catch((e) => {
      console.error("[admin curso-solicitacoes/aprovar POST] webhook:", e);
    });

    return NextResponse.json({ ok: true, pedido: row });
  } catch (e) {
    console.error("[admin curso-solicitacoes/aprovar POST]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Erro a liberar o curso.",
      },
      { status: 500 },
    );
  }
}