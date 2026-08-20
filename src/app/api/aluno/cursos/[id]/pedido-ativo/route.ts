import { NextResponse } from "next/server";

import { getStudentSession } from "@/lib/api/student-session";
import { getPedidoAtivo } from "@/lib/api/curso-pedidos";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/aluno/cursos/[id]/pedido-ativo
 * Devolve o pedido pendente/iniciado do aluno para o curso, ou null. */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id: cursoId } = await ctx.params;
  if (!cursoId?.trim()) {
    return NextResponse.json({ error: "Curso inválido." }, { status: 400 });
  }
  try {
    const pedido = await getPedidoAtivo(session.studentId, cursoId);
    return NextResponse.json({ ok: true, pedido });
  } catch (e) {
    console.error("[aluno cursos/:id/pedido-ativo GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a obter pedido." },
      { status: 500 },
    );
  }
}