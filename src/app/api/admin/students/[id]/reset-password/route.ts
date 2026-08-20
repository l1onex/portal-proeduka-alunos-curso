import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import {
  findAuthUserIdByEmail,
  updateAuthPassword,
} from "@/lib/auth/auth-users-db";
import { alunosFqn } from "@/lib/db/alunos-table";
import { getSql } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin/master: define nova senha de acesso do aluno (Auth) pelo e-mail da ficha.
 */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
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

  const fq = alunosFqn();
  const rows = await sql.unsafe<Array<{ email?: unknown }>>(
    `SELECT email FROM ${fq} WHERE id::text = $1 LIMIT 1`,
    [studentId],
  );
  const row = rows[0];

  if (!row) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const email =
    typeof row.email === "string" ? row.email.trim() : "";

  if (!email) {
    return NextResponse.json(
      { error: "Este registo não tem e-mail para localizar a conta de acesso." },
      { status: 400 },
    );
  }

  const authUserId = await findAuthUserIdByEmail(sql, email);
  if (!authUserId) {
    return NextResponse.json(
      {
        error:
          "Não foi encontrada conta de login no Auth com o e-mail deste aluno. Verifique se a conta foi criada.",
      },
      { status: 404 },
    );
  }

  const upd = await updateAuthPassword(sql, authUserId, newPassword);
  if (!upd.ok) {
    return NextResponse.json({ error: upd.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
