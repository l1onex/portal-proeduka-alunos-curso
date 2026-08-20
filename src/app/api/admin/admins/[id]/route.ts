import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { fetchProfileRoleLowercase } from "@/lib/auth/profile-role-db";
import { deleteAuthUserCascade } from "@/lib/auth/auth-users-db";
import { getSql } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (session.role !== "master") {
    return NextResponse.json(
      { error: "Apenas o master pode remover administradores." },
      { status: 403 },
    );
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

  const { id } = await ctx.params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: "Você não pode remover a si mesmo." },
      { status: 400 },
    );
  }

  let pr = "";
  try {
    pr = await fetchProfileRoleLowercase(sql, id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao verificar utilizador.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!pr) {
    return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
  }

  if (pr !== "admin" && pr !== "master") {
    return NextResponse.json(
      { error: "Só é possível remover contas de master ou administrador." },
      { status: 400 },
    );
  }

  try {
    await deleteAuthUserCascade(sql, id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao remover utilizador.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
