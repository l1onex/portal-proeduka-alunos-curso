import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { deleteCurso, getCurso, updateCurso } from "@/lib/api/cursos";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/cursos/[id] — obter curso por id. */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }
  try {
    const row = await getCurso(id);
    if (!row) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, curso: row });
  } catch (e) {
    console.error("[admin cursos/:id GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a obter curso." },
      { status: 500 },
    );
  }
}

/** PATCH /api/admin/cursos/[id] — atualizar curso. */
export async function PATCH(request: Request, ctx: Ctx) {
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

  try {
    const row = await updateCurso(id, {
      nome: typeof body.nome === "string" ? body.nome.trim() : undefined,
      descricao:
        body.descricao === undefined
          ? undefined
          : typeof body.descricao === "string"
            ? body.descricao.trim() || null
            : null,
      image_key:
        body.image_key === undefined
          ? undefined
          : typeof body.image_key === "string"
            ? body.image_key.trim() || null
            : null,
    });
    if (!row) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, curso: row });
  } catch (e) {
    console.error("[admin cursos/:id PATCH]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a atualizar curso." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/cursos/[id] — apagar curso. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }
  try {
    const ok = await deleteCurso(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin cursos/:id DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a apagar curso." },
      { status: 500 },
    );
  }
}