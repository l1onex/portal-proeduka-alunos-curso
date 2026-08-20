import { NextResponse } from "next/server";
import { requireMasterSession } from "@/lib/api/require-master";
import { fetchProfileRoleLowercase } from "@/lib/auth/profile-role-db";
import { updateAuthPassword } from "@/lib/auth/auth-users-db";
import { getSql } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Master: define nova senha da conta Auth de outro master ou administrador.
 */
export async function POST(request: Request, ctx: Ctx) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let newPassword: string;
  try {
    const body = (await request.json()) as { new_password?: string };
    newPassword =
      typeof body.new_password === "string" ? body.new_password.trim() : "";
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  let pr = "";
  try {
    pr = await fetchProfileRoleLowercase(sql, targetId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao verificar utilizador.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!pr) {
    return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
  }

  if (pr !== "admin" && pr !== "master") {
    return NextResponse.json(
      { error: "Só é possível redefinir senha de master ou administrador." },
      { status: 400 },
    );
  }

  const upd = await updateAuthPassword(sql, targetId, newPassword);
  if (!upd.ok) {
    return NextResponse.json({ error: upd.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
