import { NextResponse } from "next/server";
import {
  applyStudentPatch,
  buildStudentPatchFromJson,
  fetchStudentRow,
} from "@/lib/api/student-patch-v1";
import { deleteStudentCascade } from "@/lib/api/student-delete-service";
import { requireApiKey } from "@/lib/api/verify-api-key";
import { getAlunosTableName } from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  void getAlunosTableName();
  const fq = alunosFqn();

  try {
    const rows =
      await sql.unsafe<Array<Record<string, unknown>>>(
        `SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1`,
        [id.trim()],
      );
    const data = rows[0];
    if (!data) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ student: data });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Erro ao carregar estudante.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

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

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  const existing = await fetchStudentRow(service, id);
  if (!existing) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const built = buildStudentPatchFromJson(body, existing);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  const applied = await applyStudentPatch(service, id, built.patch);
  if (!applied.ok) {
    return NextResponse.json({ error: applied.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  const result = await deleteStudentCascade(service, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
