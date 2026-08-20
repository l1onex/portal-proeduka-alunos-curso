/**
 * Executa um ficheiro .sql contra DATABASE_URL (idempotente se o próprio SQL o for).
 *
 * USO:
 *   node --env-file=.env scripts/apply-sql-migration.mjs migrations/024_next_numero_matricula_exec_grants.sql
 */
import fs from "fs";
import path from "path";
import postgres from "postgres";

const arg = process.argv[2]?.trim();
const dbUrl = process.env.DATABASE_URL?.trim();
if (!arg || !dbUrl) {
  console.error("[pg] Precisa de PATH.sql e DATABASE_URL (.env)");
  process.exit(1);
}

const abs = path.isAbsolute(arg)
  ? arg
  : path.join(/* turbopackIgnore: true */ process.cwd(), arg);
const body = fs.readFileSync(abs, "utf8");
const sql = postgres(dbUrl, { max: 1 });
try {
  console.log("[pg] A executar:", abs);
  await sql.unsafe(body);
  console.log("[pg] OK.");
} finally {
  await sql.end({ timeout: 5 });
}
