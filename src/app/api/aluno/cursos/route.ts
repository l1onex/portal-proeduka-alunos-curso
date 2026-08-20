import { NextResponse } from "next/server";

import { getStudentSession } from "@/lib/api/student-session";
import { listCursosAluno } from "@/lib/api/aluno-cursos";

/** GET /api/aluno/cursos — lista os cursos atribuídos ao próprio aluno. */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const cursos = await listCursosAluno(session.studentId);
    return NextResponse.json({ ok: true, cursos });
  } catch (e) {
    console.error("[aluno cursos GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar cursos." },
      { status: 500 },
    );
  }
}