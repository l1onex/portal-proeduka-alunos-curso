import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { createStudentPostResponse } from "@/lib/api/student-create-service";
import type { CreateAlunoBody } from "@/lib/map-proeduka-aluno";
import { getSql } from "@/lib/db/client";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      {
        error:
          "Configure DATABASE_URL no servidor para aceder ao Postgres ao criar alunos.",
      },
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
