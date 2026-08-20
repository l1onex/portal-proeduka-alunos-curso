import { NextResponse } from "next/server";
import { createStudentPostResponse } from "@/lib/api/student-create-service";
import type { CreateAlunoBody } from "@/lib/map-proeduka-aluno";
import { requireApiKey } from "@/lib/api/verify-api-key";
import { getAlunosTableName } from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() ?? "";
  const cpfRaw = url.searchParams.get("cpf")?.trim() ?? "";
  const telefoneRaw = url.searchParams.get("telefone")?.trim() ?? "";
  const nome = url.searchParams.get("nome")?.trim() ?? "";

  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  let limit = Number.parseInt(limitRaw ?? "50", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;
  let offset = Number.parseInt(offsetRaw ?? "0", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  void getAlunosTableName();
  const fq = alunosFqn();

  const parts: string[] = [];
  const vals: (string | null)[] = [];
  let ix = 1;

  parts.push("(TRUE)");
  if (email) {
    vals.push(email);
    parts.push(`lower(trim(email::text)) = lower($${ix})`);
    ix++;
  }
  if (cpfRaw) {
    const cpf = onlyDigits(cpfRaw);
    if (cpf) {
      vals.push(cpf);
      parts.push(`cpf::text = $${ix}`);
      ix++;
    }
  }
  if (telefoneRaw) {
    const tel = onlyDigits(telefoneRaw);
    if (tel) {
      vals.push(tel);
      parts.push(`telefone::text = $${ix}`);
      ix++;
    }
  }
  if (nome) {
    vals.push(`%${nome}%`);
    parts.push(`nome::text ILIKE $${ix}`);
    ix++;
  }

  const where = `WHERE ${parts.join(" AND ")}`;
  const q = `
    SELECT * FROM ${fq}
    ${where}
    ORDER BY created_at DESC NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  try {
    const data = await sql.unsafe<Record<string, unknown>[]>(q, vals);
    return NextResponse.json({ students: data ?? [], limit, offset });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Erro ao listar estudantes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  let body: CreateAlunoBody;
  try {
    body = (await request.json()) as CreateAlunoBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  return createStudentPostResponse(service, body);
}
