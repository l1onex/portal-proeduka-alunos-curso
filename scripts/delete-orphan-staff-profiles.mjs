/**
 * Remove linhas órfãs em public.profiles (master/admin) sem auth.users correspondente.
 * Corrige listagem Equipe com e-mail "—" após remoção incompleta.
 *
 * USO: node --env-file=.env scripts/delete-orphan-staff-profiles.mjs
 */
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) process.exit(1);

const sql = postgres(dbUrl, { max: 1 });
try {
  const orphaned = await sql`
    DELETE FROM public.profiles p
    WHERE lower(trim(p.role::text)) IN ('master', 'admin')
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
    RETURNING p.id::text AS id
  `;
  console.log("[pg] Profiles staff órfãos removidos:", orphaned?.length ?? 0);
  for (const r of orphaned ?? []) console.log("[pg]", r.id);
} finally {
  await sql.end({ timeout: 5 });
}
