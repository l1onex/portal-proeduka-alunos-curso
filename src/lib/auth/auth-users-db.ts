import { randomUUID } from "node:crypto";

import { hashAuthPassword } from "@/lib/auth/password";
import type { Sql } from "@/lib/db/client";

/** Mesmo valor predefinido do Supabase / GoTrue (instância única exportada das migrações). */
export function authInstanceId(): string {
  const v = process.env.AUTH_INSTANCE_ID?.trim();
  return (
    v || "00000000-0000-0000-0000-000000000000"
  );
}

export async function findAuthUserIdByEmail(
  sql: Sql,
  rawEmail: string,
): Promise<string | null> {
  const email = rawEmail.trim().toLowerCase();
  const rows = await sql<Array<{ id: string }>>`
    SELECT id::text AS id
    FROM auth.users
    WHERE lower(trim(email::text)) = ${email}
    LIMIT 1
  `;
  const id = rows[0]?.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** Cria registo compatível com `auth.users` (GoTrue migrado para Postgres próprio). */
export async function insertAuthUserReturningId(
  sql: Sql,
  params: { email: string; password: string },
): Promise<{ id: string } | { error: string }> {
  const id = randomUUID();
  const email = params.email.trim().toLowerCase();
  const hashed = await hashAuthPassword(params.password);
  const inst = authInstanceId();

  try {
    await sql`
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        ${inst}::uuid,
        ${id}::uuid,
        'authenticated',
        'authenticated',
        ${email},
        ${hashed},
        now(),
        '{}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
      )
    `;
    return { id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate|already exists/i.test(msg)) {
      return { error: "email_duplicate" };
    }
    console.error("[insertAuthUser]", e);
    return { error: msg };
  }
}

export async function updateAuthPassword(
  sql: Sql,
  userId: string,
  plainPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const hashed = await hashAuthPassword(plainPassword);
    const out = await sql`
      UPDATE auth.users
      SET encrypted_password = ${hashed}, updated_at = now()
      WHERE id::text = ${userId}
      RETURNING id::text
    `;
    if (!out.length) {
      return { ok: false, error: "Utilizador não encontrado." };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

async function pgTableExists(
  sql: Sql,
  schema: string,
  table: string,
): Promise<boolean> {
  const rows = await sql<Array<{ ok: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = ${schema}
        AND t.table_name = ${table}
    ) AS ok
  `;
  return Boolean(rows[0]?.ok);
}

/**
 * Elimina conta GoTrue/`auth.users` e linha correspondente em `public.profiles`
 * (+ identities/sessions onde existirem).
 *
 * Só remover `auth.users` deixava `profiles` visível na Equipe quando a FK CASCADE
 * não estava efectiva ou a remoção em auth ficou incompleta (e‑mail aparecia como "—").
 *
 * Não executamos `DELETE` em tabelas `auth.*` inexistentes *dentro* da mesma
 * transacção: no Postgres um erro marca a transacção como abortada mesmo que o
 * código TypeScript apanhe a excepção (`relation does not exist`).
 */
export async function deleteAuthUserCascade(
  sql: Sql,
  userId: string,
): Promise<void> {
  const uid = userId.trim();
  if (
    uid.length !== 36 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uid,
    )
  ) {
    throw new Error("ID do utilizador inválido.");
  }

  const [hasIdentities, hasSessions] = await Promise.all([
    pgTableExists(sql, "auth", "identities"),
    pgTableExists(sql, "auth", "sessions"),
  ]);

  await sql.begin(async (tx) => {
    if (hasIdentities) {
      await tx.unsafe(`DELETE FROM auth.identities WHERE user_id = $1::uuid`, [
        uid,
      ]);
    }
    if (hasSessions) {
      await tx.unsafe(`DELETE FROM auth.sessions WHERE user_id = $1::uuid`, [
        uid,
      ]);
    }

    await tx.unsafe(`DELETE FROM public.profiles WHERE id = $1::uuid`, [uid]);
    const dropped = await tx.unsafe<Array<{ id: string }>>(
      `DELETE FROM auth.users WHERE id = $1::uuid RETURNING id::text`,
      [uid],
    );
    if (!dropped?.length) {
      throw new Error(
        "Utilizador de autenticação não encontrado (talvez já removido).",
      );
    }
  });
}
