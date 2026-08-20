import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { createCurso, listCursos } from "@/lib/api/cursos";

/** GET /api/admin/cursos — listar cursos (apenas master/admin). */
export async function GET() {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const rows = await listCursos();
    return NextResponse.json({ ok: true, cursos: rows });
  } catch (e) {
    console.error("[admin cursos GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar cursos." },
      { status: 500 },
    );
  }
}

/** POST /api/admin/cursos — criar curso (master/admin). */
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

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const descricao =
    typeof body.descricao === "string"
      ? body.descricao.trim() || null
      : null;
  const image_key =
    typeof body.image_key === "string"
      ? body.image_key.trim() || null
      : null;

  if (!nome) {
    return NextResponse.json(
      { error: "O nome do curso é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const row = await createCurso({
      nome,
      descricao,
      image_key,
      criado_por: session.userId,
    });
    return NextResponse.json({ ok: true, curso: row });
  } catch (e) {
    console.error("[admin cursos POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a criar curso." },
      { status: 500 },
    );
  }
}