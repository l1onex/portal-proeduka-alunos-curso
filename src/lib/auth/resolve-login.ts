import { getAlunosTableName } from "@/lib/aluno-tabela";
import { fetchProfileRoleLowercase } from "@/lib/auth/profile-role-db";
import { signSessionJwt, type SessionTokenPayload } from "@/lib/auth/jwt";
import { verifyAuthPasswordHash } from "@/lib/auth/password";
import { getSql } from "@/lib/db/client";
import { isPgUndefinedFunction } from "@/lib/db/pg-error";

type AuthCandidateRow = {
  user_id: string;
  encrypted_password: string | null;
};

async function fetchAuthCandidates(
  sql: ReturnType<typeof getSql>,
  emailNorm: string,
): Promise<AuthCandidateRow[]> {
  try {
    return await sql<AuthCandidateRow[]>`
      SELECT au.id::text AS user_id, au.encrypted_password
      FROM auth.users au
      WHERE lower(trim(au.email::text)) = ${emailNorm}
      ORDER BY CASE
        WHEN lower(
          trim(
            COALESCE(public.profile_role_for_user(au.id::uuid)::text, '')
          )
        ) IN ('master', 'admin') THEN 0
        ELSE 1
      END ASC,
        au.created_at ASC NULLS LAST
    `;
  } catch (e) {
    if (!isPgUndefinedFunction(e)) throw e;
    return await sql<AuthCandidateRow[]>`
      SELECT id::text AS user_id, encrypted_password
      FROM auth.users
      WHERE lower(trim(email::text)) = ${emailNorm}
      ORDER BY created_at ASC NULLS LAST
    `;
  }
}

type LoginOk = {
  token: string;
  redirect: "/admin" | "/aluno";
};

export type LoginFailureReason =
  | "bad_credentials"
  | "no_student_record"
  | "db";

function sanitizeTableIdent(ident: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    throw new Error("Nome da tabela de alunos inválido.");
  }
  return ident;
}

/**
 * Encontra o(s) utilizador(es) Auth com aquele e-mail e devolve os que passam na
 * verificação de senha. Se houver vários com a mesma palavra-passe (raríssimo),
 * mantém todas as IDs para posterior preferência pela conta equipa (`profiles`).
 */
async function authUserIdsMatchingPassword(params: {
  sql: ReturnType<typeof getSql>;
  emailNorm: string;
  password: string;
}): Promise<string[]> {
  const { sql, emailNorm, password } = params;
  const cands = await fetchAuthCandidates(sql, emailNorm);

  const out: string[] = [];
  for (const c of cands) {
    const uid = c.user_id?.trim();
    if (!uid) continue;
    if (await verifyAuthPasswordHash(password, c.encrypted_password)) {
      out.push(uid);
    }
  }
  return out;
}

/**
 * Fluxo: perfil master/admin → `/admin`; caso contrário exige linha na tabela de
 * alunos com o mesmo e-mail (senão `no_student_record`).
 *
 * Várias linhas em `auth.users` com o mesmo e-mail (migração / duplicação sem
 * constraint único) faziam `LIMIT 1` escolher a conta «errada». Resolvemos assim:
 * todas as linhas candidatas são testadas pela senha; se mais de uma bater,
 * preferimos a primeira com papel staff em `profiles`.
 */
export async function authenticateEmailPassword(params: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; value: LoginOk }
  | { ok: false; reason: LoginFailureReason; detail?: string }
> {
  const emailNorm = params.email.trim().toLowerCase();
  const password = params.password;
  if (!emailNorm || !password) {
    return { ok: false, reason: "bad_credentials" };
  }

  const sql = getSql();

  try {
    const verifiedIds = await authUserIdsMatchingPassword({
      sql,
      emailNorm,
      password,
    });
    if (verifiedIds.length === 0) {
      return { ok: false, reason: "bad_credentials" };
    }

    /** Conta seleccionada: preferência staff quando há vários user_id válidos à mesma senha. */
    let userIdForSession = verifiedIds[0];
    if (verifiedIds.length > 1) {
      for (const uid of verifiedIds) {
        const role = await fetchProfileRoleLowercase(sql, uid);
        if (role === "master" || role === "admin") {
          userIdForSession = uid;
          break;
        }
      }
    }

    const pr = await fetchProfileRoleLowercase(sql, userIdForSession);

    if (pr === "master" || pr === "admin") {
      const jwtPayload: SessionTokenPayload = {
        sub: userIdForSession,
        email: emailNorm,
        typ: "staff",
        role: pr as "master" | "admin",
      };
      const token = await signSessionJwt(jwtPayload);
      return { ok: true, value: { token, redirect: "/admin" } };
    }

    const table = sanitizeTableIdent(getAlunosTableName());

    const alunoRows = await sql.unsafe<{ id: string }[]>(
      `SELECT id::text AS id FROM public."${table}" WHERE lower(trim(email::text)) = lower($1) LIMIT 1`,
      [emailNorm],
    );

    const studentId = alunoRows[0]?.id;
    if (!studentId) {
      return { ok: false, reason: "no_student_record" };
    }

    const jwtPayload: SessionTokenPayload = {
      sub: userIdForSession,
      email: emailNorm,
      typ: "student",
      sid: studentId,
    };
    const token = await signSessionJwt(jwtPayload);
    return { ok: true, value: { token, redirect: "/aluno" } };
  } catch (e) {
    console.error("[auth login]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "db", detail: msg };
  }
}
