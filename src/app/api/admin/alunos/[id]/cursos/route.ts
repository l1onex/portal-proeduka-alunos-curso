import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import {
  atribuirCursoAluno,
  desatribuirCursoAluno,
  listCursosAluno,
  listCursosDisponiveisParaAluno,
} from "@/lib/api/aluno-cursos";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/alunos/[id]/cursos
 *  - `?disponiveis=1` → lista cursos que o aluno AINDA não tem (para o select do admin).
 *  - caso contrário → lista cursos atribuídos ao aluno.
 */
export async function GET(request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }
  try {
    const url = new URL(request.url);
    const soDisponiveis = url.searchParams.get("disponiveis") === "1";
    if (soDisponiveis) {
      const cursos = await listCursosDisponiveisParaAluno(id);
      return NextResponse.json({ ok: true, cursos });
    }
    const cursos = await listCursosAluno(id);
    return NextResponse.json({ ok: true, cursos });
  } catch (e) {
    console.error("[admin aluno/:id/cursos GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar cursos." },
      { status: 500 },
    );
  }
}

/** POST /api/admin/alunos/[id]/cursos — atribuir curso ao aluno.
 *  Body: { curso_id: string }
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
    const row = await atribuirCursoAluno({
      alunoId: id,
      cursoId,
      atribuidoPor: session.userId,
    });
    return NextResponse.json({ ok: true, curso: row });
  } catch (e) {
    console.error("[admin aluno/:id/cursos POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a atribuir curso." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/alunos/[id]/cursos — desatribuir curso.
 *  Body: { curso_id: string }
 */
export async function DELETE(request: Request, ctx: Ctx) {
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
    const ok = await desatribuirCursoAluno({ alunoId: id, cursoId });
    if (!ok) {
      return NextResponse.json(
        { error: "Curso não estava atribuído a este aluno." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin aluno/:id/cursos DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a desatribuir curso." },
      { status: 500 },
    );
  }
}