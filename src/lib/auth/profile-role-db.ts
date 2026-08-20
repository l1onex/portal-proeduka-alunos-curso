import type { Sql } from "@/lib/db/client";
import { isPgUndefinedFunction } from "@/lib/db/pg-error";

/**
 * Lê `profiles.role` de preferência pela função definer da migração 023 (RLS-proof).
 * Se a migração ainda não existir (`42883`), faz SELECT directo à tabela.
 */
export async function fetchProfileRoleLowercase(
  sql: Sql,
  userIdText: string,
): Promise<string> {
  try {
    const rr = await sql<Array<{ role: string | null }>>`
      SELECT public.profile_role_for_user(${userIdText}::uuid) AS role
    `;
    const raw = rr[0]?.role;
    return typeof raw === "string" ? raw.trim().toLowerCase() : "";
  } catch (e) {
    if (!isPgUndefinedFunction(e)) throw e;
    const jr = await sql<Array<{ role: string | null }>>`
      SELECT p.role::text AS role
      FROM public.profiles p
      WHERE p.id::text = ${userIdText}
      LIMIT 1
    `;
    const raw = jr[0]?.role;
    return typeof raw === "string" ? raw.trim().toLowerCase() : "";
  }
}
