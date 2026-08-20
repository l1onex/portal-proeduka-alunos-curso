import { NextResponse } from "next/server";

import { getStudentSession } from "@/lib/api/student-session";
import { criarPedido, getPedidoAtivo } from "@/lib/api/curso-pedidos";
import { getSql } from "@/lib/db/client";
import { insertCertificadoSolicitadoNotification } from "@/lib/admin/staff-notifications";
import { dispatchCertificateRequestedWebhook } from "@/lib/webhooks/dispatch";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/aluno/cursos/[id]/solicitar
 * Cria um pedido de certificado para o curso `id`. Idempotente.
 * Também regista uma notificação na campaninha admin e dispara o webhook
 * `certificate_requested` (com snapshot do curso).
 */
export async function POST(_request: Request, ctx: Ctx) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id: cursoId } = await ctx.params;
  if (!cursoId?.trim()) {
    return NextResponse.json({ error: "Curso inválido." }, { status: 400 });
  }
  try {
    const existente = await getPedidoAtivo(session.studentId, cursoId);
    if (existente) {
      return NextResponse.json({
        ok: true,
        pedido: existente,
        alreadyExists: true,
      });
    }
    const pedido = await criarPedido({
      alunoId: session.studentId,
      cursoId,
    });
    const nowIso = new Date().toISOString();

    // Avisa a equipa administrativa (campainha de notificações).
    try {
      const sql = getSql();
      const rows = await sql<{ nome: string | null }[]>`
        SELECT nome FROM public.proeduka_alunos WHERE id = ${session.studentId}::uuid LIMIT 1
      `;
      const nomeAluno =
        rows[0]?.nome?.trim() || session.email || "Aluno";
      const notif = await insertCertificadoSolicitadoNotification(sql, {
        studentId: session.studentId,
        studentName: nomeAluno,
      });
      if (!notif.ok) {
        console.error(
          "[aluno cursos/:id/solicitar POST] notificação:",
          notif.error,
        );
      }
    } catch (notifErr) {
      console.error(
        "[aluno cursos/:id/solicitar POST] notificação (catch):",
        notifErr,
      );
    }

    // Webhook `certificate_requested` com snapshot do curso (não bloqueia o fluxo).
    void dispatchCertificateRequestedWebhook({
      studentId: session.studentId,
      requestedAtIso: nowIso,
      cursoId,
    }).catch((e) => {
      console.error("[aluno cursos/:id/solicitar POST] webhook:", e);
    });

    return NextResponse.json({ ok: true, pedido });
  } catch (e) {
    console.error("[aluno cursos/:id/solicitar POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a criar pedido." },
      { status: 500 },
    );
  }
}