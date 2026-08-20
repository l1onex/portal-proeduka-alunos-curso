import { NextResponse } from "next/server";

import { getStudentSession } from "@/lib/api/student-session";
import { updateAuthPassword } from "@/lib/auth/auth-users-db";
import { verifyAuthPasswordHash } from "@/lib/auth/password";
import { getSql } from "@/lib/db/client";

type Body = {
  current_password?: unknown;
  new_password?: unknown;
};

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const cur =
    typeof body.current_password === "string"
      ? body.current_password
      : "";
  const next =
    typeof body.new_password === "string" ? body.new_password : "";
  if (next.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }

  const sql = getSql();
  const rows = await sql<Array<{ encrypted_password: string | null }>>`
    SELECT encrypted_password
    FROM auth.users
    WHERE id::text = ${session.userId}
    LIMIT 1
  `;
  const hash = rows[0]?.encrypted_password;
  const okPwd = await verifyAuthPasswordHash(cur, hash ?? null);
  if (!okPwd) {
    return NextResponse.json(
      { error: "Senha atual incorreta." },
      { status: 400 },
    );
  }

  const upd = await updateAuthPassword(sql, session.userId, next);
  if (!upd.ok) {
    return NextResponse.json({ error: upd.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
