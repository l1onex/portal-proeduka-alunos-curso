import { NextResponse } from "next/server";

import { getStudentSession } from "@/lib/api/student-session";
import { criarCursoSolicitacao } from "@/lib/api/curso-solicitacoes";
import { getSql } from "@/lib/db/client";
import { insertStaffNotification } from "@/lib/admin/staff-notifications";
import { dispatchCourseRequestedWebhook } from "@/lib/webhooks/course-dispatch";

/**
 * POST /api/aluno/cursos/solicitar
 * Body: { curso_id: string }
 *
 * Cria um pedido para que o aluno seja adicionado a um curso
 * (liberação fica a cargo do admin). Idempotente — se já houver
 * pedido pendente para o mesmo curso, devolve o existente.
 *
 * Também cria uma notificação na campaninha admin.
 */
export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const cursoId = typeof body.curso_id === "string" ? body.curso_id.trim() : "";
  if (!cursoId) {
    return NextResponse.json(
      { error: "Informe o curso (curso_id)." },
      { status: 400 },
    );
  }

  try {
    const sql = getSql();
    // Confirma que o curso existe.
    const cursoRows = await sql<{ id: string; nome: string | null }[]>`
      SELECT id::text AS id, nome
      FROM public.proeduka_cursos
      WHERE id = ${cursoId}::uuid
      LIMIT 1
    `;
    const curso = cursoRows[0];
    if (!curso) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }

    // Se o aluno já tem o curso atribuído, não precisa de pedido.
    const atribuidos = await sql<{ id: string }[]>`
      SELECT id::text AS id
      FROM public.proeduka_aluno_cursos
      WHERE aluno_id = ${session.studentId}::uuid
        AND curso_id = ${cursoId}::uuid
      LIMIT 1
    `;
    if (atribuidos.length > 0) {
      return NextResponse.json(
        { error: "Você já tem este curso atribuído." },
        { status: 409 },
      );
    }

    const pedido = await criarCursoSolicitacao({
      alunoId: session.studentId,
      cursoId,
    });

    // Notificação admin (campainha).
    try {
      const alunoRows = await sql<{ nome: string | null }[]>`
        SELECT nome FROM public.proeduka_alunos WHERE id = ${session.studentId}::uuid LIMIT 1
      `;
      const alunoNome = alunoRows[0]?.nome?.trim() || session.email || "Aluno";
      const notif = await insertStaffNotification(sql, {
        kind: "curso_solicitado",
        studentId: session.studentId,
        studentName: alunoNome,
        body: `${alunoNome} solicitou o curso "${curso.nome ?? "?"}".`,
        metadata: { solicitacao_id: pedido.id, curso_id: cursoId },
      });
      if (!notif.ok) {
        console.error(
          "[aluno cursos/solicitar POST] notificação:",
          notif.error,
        );
      }
    } catch (notifErr) {
      console.error(
        "[aluno cursos/solicitar POST] notificação (catch):",
        notifErr,
      );
    }

    // Webhook `course_requested` (não bloqueia o fluxo do aluno).
    void dispatchCourseRequestedWebhook({
      studentId: session.studentId,
      cursoId,
      requestedAtIso: new Date().toISOString(),
    }).catch((e) => {
      console.error("[aluno cursos/solicitar POST] webhook:", e);
    });

    return NextResponse.json({ ok: true, pedido });
  } catch (e) {
    console.error("[aluno cursos/solicitar POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a criar pedido." },
      { status: 500 },
    );
  }
}