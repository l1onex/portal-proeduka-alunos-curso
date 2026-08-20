/**
 * Remove utilizadores em auth.users com o mesmo email de uma conta staff, mas sem
 * linha em public.profiles ('órfão'). Corrige login quando a senha bate só na
 * conta órfã e não na conta admin/master.
 *
 * USO:
 *   node --env-file=.env scripts/remove-orphan-dup-auth-user.mjs [email]
 */
import postgres from "postgres";

const email = (process.argv[2] || "").trim().toLowerCase();
const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl || !email) process.exit(1);

async function tableExists(sql, fqname) {
  const [sch, tbl] = String(fqname).split(".");
  if (!sch || !tbl) return false;
  const r = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables st
      WHERE st.table_schema = ${sch}
        AND st.table_name = ${tbl}
    ) AS ok
  `;
  return Boolean(r?.[0]?.ok);
}

const sql = postgres(dbUrl, { max: 1 });
try {
  const rows = await sql`
    SELECT au.id AS id,
      au.created_at,
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id) AS has_profile,
      (SELECT lower(p.role::text) FROM public.profiles p WHERE p.id = au.id LIMIT 1) AS role
    FROM auth.users au
    WHERE lower(trim(au.email::text)) = ${email}
    ORDER BY au.created_at ASC NULLS LAST
  `;
  console.log("[rm] utilizadores mesmo email:", rows.length);

  const staff = rows.filter(
    (r) =>
      r.has_profile &&
      ["master", "admin"].includes(String(r.role ?? "").toLowerCase()),
  );
  const orphans = rows.filter((r) => !r.has_profile);

  if (staff.length === 0) {
    console.error("[rm] Abortado: não há conta com profiles staff neste email.");
    process.exit(2);
  }
  if (orphans.length === 0) {
    console.log("[rm] Nenhum órfão (sem profiles). Nada a fazer.");
    process.exit(0);
  }

  const hasSessions = await tableExists(sql, "auth.sessions");

  await sql.begin(async (tx) => {
    for (const o of orphans) {
      const oid = o.id;
      console.log("[rm] removendo órfão", String(oid));
      await tx.unsafe(`DELETE FROM auth.identities WHERE user_id = $1::uuid`, [
        oid,
      ]);
      if (hasSessions) {
        await tx.unsafe(`DELETE FROM auth.sessions WHERE user_id = $1::uuid`, [
          oid,
        ]);
      }
      await tx.unsafe(`DELETE FROM auth.users WHERE id = $1::uuid`, [oid]);
    }
  });

  const after = await sql`
    SELECT id::text AS id FROM auth.users
    WHERE lower(trim(email::text)) = ${email}
  `;
  console.log("[rm] auth.users restantes para este email:", after.length);
} finally {
  await sql.end({ timeout: 5 });
}
