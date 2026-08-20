import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { recusarCursoSolicitacao } from "@/lib/api/curso-solicitacoes";
import { getSql } from "@/lib/db/client";
import { insertStaffNotification } from "@/lib/admin/staff-notifications";

/**
 * POST /api/admin/curso-solicitacoes/recusar
 * Body: { solicitacao_id: string, motivo?: string }
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
  const motivo =
    typeof body.motivo === "string" && body.motivo.trim()
      ? body.motivo.trim()
      : null;

  try {
    const row = await recusarCursoSolicitacao({
      solicitacaoId,
      decididoPor: session.userId,
      motivo,
    });

    // Notificação admin (histórico).
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
        kind: "curso_recusado",
        studentId: row.aluno_id,
        studentName: alunoNome,
        body: `Curso "${cursoNome}" recusado para ${alunoNome}.`,
        metadata: {
          solicitacao_id: solicitacaoId,
          curso_id: row.curso_id,
          decidido_por: session.userId,
          motivo,
        },
      });
    } catch (notifErr) {
      console.error(
        "[admin curso-solicitacoes/recusar POST] notificação:",
        notifErr,
      );
    }

    return NextResponse.json({ ok: true, pedido: row });
  } catch (e) {
    console.error("[admin curso-solicitacoes/recusar POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a recusar." },
      { status: 500 },
    );
  }
}