/**
 * Cria o primeiro utilizador master no Auth + public.profiles.
 *
 * Uso:
 *   node --env-file=.env scripts/bootstrap-first-master.mjs <email> <password> <nome_completo>
 *
 * Exemplo:
 *   node --env-file=.env scripts/bootstrap-first-master.mjs admin@exemplo.com Senha1234 "Nome do Admin"
 */
import postgres from "postgres";

import { ensureAuthSchema } from "./bootstrap-auth-core.mjs";
import { ensureBootstrapMaster } from "./bootstrap-master-core.mjs";

const email = (process.argv[2] || "").trim().toLowerCase();
const password = process.argv[3] || "";
const fullName = (process.argv[4] || "").trim();
const dbUrl = process.env.DATABASE_URL?.trim();

if (!dbUrl) {
  console.error("[pg] DATABASE_URL não definido.");
  process.exit(1);
}

if (!email || !password || !fullName) {
  console.error(
    "[pg] Uso: node --env-file=.env scripts/bootstrap-first-master.mjs <email> <password> <nome_completo>",
  );
  process.exit(1);
}

if (password.length < 6) {
  console.error("[pg] A senha deve ter pelo menos 6 caracteres.");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

try {
  await ensureAuthSchema(sql);
  const result = await ensureBootstrapMaster(sql, {
    config: { email, password, fullName },
  });

  console.log("[pg] Master bootstrap concluído.");
  console.log("[pg] createdAuth:", result.createdAuth ? "yes" : "no");
  console.log("[pg] createdProfile:", result.createdProfile ? "yes" : "no");
  console.log("[pg] user_id:", result.userId);
  console.log("[pg] email:", result.email);
} finally {
  await sql.end({ timeout: 5 });
}
