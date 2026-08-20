import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { getSql } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/alunos/[id]/cursos/concluido
 * Body: { curso_id: string }
 *
 * Marca o curso atribuído como `concluido` (com `concluido_em = now()`).
 */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
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
    const rows = await sql<{ id: string }[]>`
      UPDATE public.proeduka_aluno_cursos
      SET
        status = 'concluido',
        concluido_em = now(),
        concluido_por = ${session.userId}::uuid
      WHERE aluno_id = ${id}::uuid
        AND curso_id = ${cursoId}::uuid
      RETURNING id::text AS id
    `;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Curso não está atribuído a este aluno." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin aluno/:id/cursos/concluido POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a marcar como concluído." },
      { status: 500 },
    );
  }
}