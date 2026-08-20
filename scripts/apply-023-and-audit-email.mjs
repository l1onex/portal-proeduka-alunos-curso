/**
 * Idempotente: aplica migração 023 (SECURITY DEFINER para login/listagem staff)
 * e audita conta(s) com um e-mail (duplicados em auth.users + papel em profiles).
 *
 * USO:
 *   node --env-file=.env scripts/apply-023-and-audit-email.mjs [email]
 *
 * Não imprime DATABASE_URL nem passwords.
 */

import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

async function main() {
  const emailArg = (
    process.argv[2]?.trim().toLowerCase() || ""
  ).toLowerCase();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error(
      "[pg] DATABASE_URL não definido. Confirme .env ou stack.env carregados.",
    );
    process.exit(1);
  }

  const sql = postgres(dbUrl, { max: 1 });

  try {
    const migPath = path.join(
      PROJECT_ROOT,
      "migrations",
      "023_profiles_staff_rls_helpers.sql",
    );
    const mig = fs.readFileSync(migPath, "utf8");
    console.log("[pg] Aplicando 023_profiles_staff_rls_helpers.sql …");
    await sql.unsafe(mig);
    console.log("[pg] Migração 023 aplicada (CREATE OR REPLACE).");

    const fnOk = await sql`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'profile_role_for_user'
      LIMIT 1
    `;
    console.log(
      "[pg] Função profile_role_for_user:",
      fnOk?.length ? "OK" : "MISSING",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }

  const sqlRead = postgres(dbUrl, { max: 1 });
  try {
    if (!emailArg) {
      console.log("[pg] Audit: passe um email como segundo arg para relatório.");
      return;
    }
    console.log("[pg] Audit para email:", emailArg);

    const authRows =
      await sqlRead`SELECT id::text AS id, created_at
      FROM auth.users
      WHERE lower(trim(email::text)) = ${emailArg}
      ORDER BY created_at ASC NULLS LAST`;

    console.log("[pg] auth.users linhas:", authRows.length);
    if (authRows.length === 0) {
      return;
    }

    for (const r of authRows) {
      const uid = String(r.id);
      const rr =
        await sqlRead`SELECT public.profile_role_for_user(${uid}::uuid) AS role`;
      const role = rr?.[0]?.role ?? "(null)";
      console.log("[pg]", "user", uid.slice(-8), "created_at=", r.created_at, "profiles.role=", role);
    }

    /** @type {{ id: string; role: unknown }[]} */
    const prof =
      await sqlRead`SELECT id::text AS id, role::text AS role FROM public.profiles WHERE lower(trim(email::text)) = ${emailArg}`;
    console.log("[pg] profiles com mesmo email (por coluna profiles.email):", prof.length);

    /** @type { { id_aluno?: string | null }[] } */
    const alunoSnippet = [];
    try {
      const tn =
        await sqlRead`SELECT c.relname::text AS t
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
          WHERE ns.nspname = 'public'
            AND c.relkind IN ('r','p')
            AND c.relname IN ('Alunos','alunos','proeduka_alunos')
          LIMIT 1`;
      const t = tn?.[0]?.t;
      if (t && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(t))) {
        const tbl = `"${String(t).replace(/"/g, '""')}"`;
        const ar = await sqlRead.unsafe(
          `SELECT id::text AS id FROM public.${tbl} WHERE lower(trim(email::text)) = lower($1) LIMIT 5`,
          [emailArg],
        );
        console.log("[pg] tabela alunos", t, "linhas mesmo email:", ar.length);
        for (const a of ar) alunoSnippet.push({ id_aluno: a?.id ?? null });
      }
    } catch {
      console.log("[pg] (opcional) leitura tabela de alunos por email falhou ou tabela diferente.");
    }
  } finally {
    await sqlRead.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("[pg]", e);
  process.exit(1);
});
