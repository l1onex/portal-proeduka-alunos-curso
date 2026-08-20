/**
 * Arranque do container Docker:
 *   1) Espera a DB (scripts/wait-for-db.mjs) — sai se não responder.
 *   2) Aplica migrações pendentes (scripts/apply-all-migrations.mjs).
 *      Idempotente: a tabela `public.app_migrations` regista o que já correu.
 *   3) Lança `node server.js` com stdio herdado (PID 1 recebe sinais).
 *
 * Variáveis de ambiente opcionais:
 *   PROEDUKA_SKIP_MIGRATIONS=1   → salta o passo de migrações.
 *   PROEDUKA_DB_WAIT_TIMEOUT_MS  → timeout de espera pela DB (default 90000).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

function runNode(scriptRelPath, label) {
  return new Promise((resolve, reject) => {
    const script = path.join(here, scriptRelPath);
    console.log(`[start] ${label}…`);
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} saiu com código ${code}`));
    });
    child.on("error", reject);
  });
}

try {
  await runNode("wait-for-db.mjs", "Aguardar base de dados");

  if (process.env.PROEDUKA_SKIP_MIGRATIONS === "1") {
    console.log("[start] PROEDUKA_SKIP_MIGRATIONS=1 — migrações ignoradas.");
  } else {
    await runNode("apply-all-migrations.mjs", "Aplicar migrações");
  }
} catch (err) {
  console.error(`[start] Falha: ${err.message}`);
  process.exit(1);
}

console.log("[start] A iniciar Next.js (server.js)…");
const server = spawn(process.execPath, [path.join(here, "..", "server.js")], {
  stdio: "inherit",
  env: process.env,
});

const forwardSignal = (sig) => () => {
  if (!server.killed) server.kill(sig);
};
process.on("SIGTERM", forwardSignal("SIGTERM"));
process.on("SIGINT", forwardSignal("SIGINT"));

server.on("exit", (code, signal) => {
  if (signal) {
    console.log(`[start] server.js terminado por sinal ${signal}.`);
    process.exit(0);
  }
  process.exit(code ?? 0);
});
