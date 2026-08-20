import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/api/student-session";
import { ensureRegistroEscolarParaEmAnalise } from "@/lib/api/ensure-registro-escolar-em-analise";
import { getSql } from "@/lib/db/client";

export const runtime = "nodejs";

/**
 * Aluno autenticado: garante registo escolar se o cadastro estiver “em análise” e ainda vazio.
 */
export async function POST() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  const result = await ensureRegistroEscolarParaEmAnalise(
    service,
    session.studentId,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  if (result.assigned) {
    return NextResponse.json({
      ok: true,
      assigned: true,
      numero_registro: result.value.numero_registro,
      livro: result.value.livro,
      pagina: result.value.pagina,
    });
  }
  return NextResponse.json({ ok: true, assigned: false });
}
