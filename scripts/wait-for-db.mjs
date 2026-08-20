/**
 * Espera que a base de dados Postgres esteja pronta para aceitar ligações.
 * Útil no arranque do container, quando o `postgres` do stack pode ainda
 * estar a inicializar.
 *
 * Lê `DATABASE_URL` do ambiente. Sai com código 0 em sucesso, !=0 em timeout.
 */
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error("[wait-for-db] DATABASE_URL não definido.");
  process.exit(1);
}

const timeoutMs = Number(process.env.PROEDUKA_DB_WAIT_TIMEOUT_MS ?? 90_000);
const intervalMs = Number(process.env.PROEDUKA_DB_WAIT_INTERVAL_MS ?? 1_000);
const startedAt = Date.now();

const sql = postgres(dbUrl, {
  max: 1,
  connect_timeout: 5,
  idle_timeout: 1,
});

let attempt = 0;
while (true) {
  attempt += 1;
  try {
    await sql`SELECT 1 AS ok`;
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[wait-for-db] DB pronta após ${attempt} tentativa(s), ${elapsed}s.`);
    break;
  } catch (_err) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) {
      console.error(
        `[wait-for-db] Timeout após ${Math.round(elapsed / 1000)}s sem resposta da DB.`,
      );
      await sql.end({ timeout: 1 }).catch(() => {});
      process.exit(1);
    }
    if (attempt === 1 || attempt % 10 === 0) {
      console.log(`[wait-for-db] A aguardar DB... (tentativa ${attempt})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

await sql.end({ timeout: 1 }).catch(() => {});
process.exit(0);
