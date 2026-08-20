import { NextResponse } from "next/server";
import { ensureRegistroEscolarParaEmAnalise } from "@/lib/api/ensure-registro-escolar-em-analise";
import { getStaffSession } from "@/lib/api/staff-session";
import { getSql } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/** Staff: mesma lógica que o endpoint do aluno, para após gravações feitas pelo painel admin. */
export async function POST(_request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
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

  const result = await ensureRegistroEscolarParaEmAnalise(service, studentId);
  if (!result.ok) {
    const status = result.error === "Aluno não encontrado." ? 404 : 503;
    return NextResponse.json({ error: result.error }, { status });
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
