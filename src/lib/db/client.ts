import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __proedukaSql: postgres.Sql | undefined;
}

const CI_PG_PLACEHOLDER =
  "postgresql://postgres:postgres@127.0.0.1:5432/ci_placeholder_db";

function requireDatabaseUrl(): string {
  let u = process.env.DATABASE_URL?.trim();
  if ((!u || u.length === 0) && process.env.CI === "true") {
    u = CI_PG_PLACEHOLDER;
  }
  if (!u) {
    throw new Error(
      "Defina DATABASE_URL no ambiente (.env ou stack — Postgres direto).",
    );
  }
  return u;
}

/**
 * Ligação Postgres (uso no servidor apenas). Preferir papel com bypass de RLS
 * (ex.: `postgres`) tal como era o comportamento da service_role no Supabase.
 */
export function getSql(): postgres.Sql {
  if (!globalThis.__proedukaSql) {
    globalThis.__proedukaSql = postgres(requireDatabaseUrl(), {
      max: 14,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalThis.__proedukaSql;
}

export type Sql = postgres.Sql;

/** Pool principal ou cliente dentro de `sql.begin` (mesma semântica de queries). */
export type SqlQueryable = postgres.Sql | postgres.TransactionSql;
