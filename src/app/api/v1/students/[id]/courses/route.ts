import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/api/verify-api-key";
import {
  atribuirCursoAluno,
  desatribuirCursoAluno,
  listCursosAluno,
  listCursosDisponiveisParaAluno,
} from "@/lib/api/aluno-cursos";
import { getSql } from "@/lib/db/client";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/students/{id}/courses
 *
 * Lista cursos do aluno. Com `?disponiveis=1`, lista os cursos do
 * sistema que o aluno AINDA não tem (útil para escolher o id antes
 * de atribuir). Autenticação: API Key.
 *
 * **curl**\n```bash
 * curl -sS -H "Authorization: Bearer $PEK" \
 *   "https://host/api/v1/students/STUDENT_UUID/courses"
 *
 * # cursos que o aluno NÃO tem:
 * curl -sS -H "Authorization: Bearer $PEK" \
 *   "https://host/api/v1/students/STUDENT_UUID/courses?disponiveis=1"
 * ```
 */
export async function GET(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID do aluno é obrigatório." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const exists = await sql<{ id: string }[]>`
      SELECT id::text AS id FROM public.proeduka_alunos
      WHERE id = ${id.trim()}::uuid
      LIMIT 1
    `;
    if (exists.length === 0) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    const url = new URL(request.url);
    const soDisponiveis = url.searchParams.get("disponiveis") === "1";

    if (soDisponiveis) {
      const rows = await listCursosDisponiveisParaAluno(id.trim());
      const cursos = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          image_url: await getSignedStorageUrl(r.image_key),
        })),
      );
      return NextResponse.json({ cursos });
    }

    const rows = await listCursosAluno(id.trim());
    const cursos = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        image_url: await getSignedStorageUrl(r.image_key),
      })),
    );
    return NextResponse.json({ cursos });
  } catch (e) {
    console.error("[api/v1/students/:id/courses GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar cursos." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/students/{id}/courses
 *
 * Atribui um curso ao aluno (idempotente: se já existir a atribuição,
 * devolve a existente). Body JSON: `{ "curso_id": "<uuid>" }`.
 * Autenticação: API Key.
 *
 * **curl**\n```bash
 * curl -sS -X POST -H "Authorization: Bearer $PEK" \
 *   -H "Content-Type: application/json" \
 *   -d '{"curso_id":"CURSO_UUID"}' \
 *   "https://host/api/v1/students/STUDENT_UUID/courses"
 * ```
 */
export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID do aluno é obrigatório." }, { status: 400 });
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

    // Confirma aluno e curso.
    const alunoExists = await sql<{ id: string }[]>`
      SELECT id::text AS id FROM public.proeduka_alunos
      WHERE id = ${id.trim()}::uuid LIMIT 1
    `;
    if (alunoExists.length === 0) {
      return NextResponse.json(
        { error: "Aluno não encontrado." },
        { status: 404 },
      );
    }
    const cursoExists = await sql<{ id: string }[]>`
      SELECT id::text AS id FROM public.proeduka_cursos
      WHERE id = ${cursoId}::uuid LIMIT 1
    `;
    if (cursoExists.length === 0) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }

    // api_keys: não temos staff user; gravamos o "atribuido_por" como NULL
    // (o INSERT aceita nulo).
    const row = await atribuirCursoAluno({
      alunoId: id.trim(),
      cursoId,
      atribuidoPor: null,
    });
    return NextResponse.json({ ok: true, curso: row });
  } catch (e) {
    console.error("[api/v1/students/:id/courses POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a atribuir curso." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/students/{id}/courses
 *
 * Remove a atribuição de um curso. Body JSON: `{ "curso_id": "<uuid>" }`.
 * Autenticação: API Key.
 *
 * **curl**\n```bash
 * curl -sS -X DELETE -H "Authorization: Bearer $PEK" \
 *   -H "Content-Type: application/json" \
 *   -d '{"curso_id":"CURSO_UUID"}' \
 *   "https://host/api/v1/students/STUDENT_UUID/courses"
 * ```
 */
export async function DELETE(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID do aluno é obrigatório." }, { status: 400 });
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
    const ok = await desatribuirCursoAluno({ alunoId: id.trim(), cursoId });
    if (!ok) {
      return NextResponse.json(
        { error: "Curso não estava atribuído a este aluno." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/v1/students/:id/courses DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a desatribuir curso." },
      { status: 500 },
    );
  }
}