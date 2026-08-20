import postgres from "postgres";

import { bootstrapRegistroEscolarSchema } from "@/lib/db/bootstrap-registro-escolar-schema";
import { runBirthdayWebhooksForToday } from "@/lib/webhooks/dispatch";
import {
  applyMigrationsFromDir,
  defaultMigrationsDir,
} from "../scripts/migration-runner.mjs";
import { ensureBootstrapMaster } from "../scripts/bootstrap-master-core.mjs";

async function runDatabaseMigrations() {
  const result = await applyMigrationsFromDir({
    migrationsDir: defaultMigrationsDir(),
  });
  console.info(
    `[proeduka][migrations] applied=${result.applied} skipped=${result.skipped}`,
  );
}

async function ensureBootstrapMasterAccount() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) return;

  const sql = postgres(dbUrl, { max: 1 });
  try {
    const result = await ensureBootstrapMaster(sql);
    if (!result.skipped) {
      console.info(
        `[proeduka][master-bootstrap] createdAuth=${result.createdAuth ? "yes" : "no"} createdProfile=${result.createdProfile ? "yes" : "no"} email=${result.email}`,
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function logStartupDiagnostics() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  let appHost: string | null = null;
  try {
    if (appUrl) appHost = new URL(appUrl).hostname;
  } catch {
    appHost = "(URL inválida)";
  }

  const alunosTable =
    process.env.NEXT_PUBLIC_ALUNOS_TABLE?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE?.trim() ||
    "proeduka_alunos";

  const secretLen = process.env.SESSION_SECRET?.trim().length ?? 0;

  console.info(
    JSON.stringify({
      tag: "[proeduka][startup]",
      node: process.version,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT ?? "3000",
      hostListen: process.env.HOSTNAME ?? "(default)",
      nextPublic: {
        appUrl: appUrl || null,
        appHost,
        alunosTable,
      },
      serverRuntime: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
        sessionSecretConfigured: secretLen >= 32,
      },
      hint:
        "Login via JWT em cookie (`SESSION_SECRET`). O browser só recebe dados NEXT_PUBLIC_* do último build.",
    }),
  );
}

/**
 * Só em Node (importado por `instrumentation.ts` quando NEXT_RUNTIME === 'nodejs').
 * Edge não suporta process.version / node-cron.
 */
export async function registerNodeInstrumentation() {
  logStartupDiagnostics();

  try {
    await runDatabaseMigrations();
  } catch (e) {
    console.error("[proeduka][migrations] falhou:", e);
    throw e;
  }

  try {
    await ensureBootstrapMasterAccount();
  } catch (e) {
    console.error("[proeduka][master-bootstrap] falhou:", e);
    throw e;
  }

  try {
    await bootstrapRegistroEscolarSchema();
  } catch (e) {
    console.error("[proeduka][registro-bootstrap] falhou (o app corre; só registo escolar pode falhar):", e);
  }

  if (process.env.NODE_ENV !== "production") return;
  if (process.env.ENABLE_INTERNAL_CRON === "false") return;

  const secret =
    process.env.CRON_SECRET?.trim() || process.env.CRON_WEBHOOK_SECRET?.trim();
  if (!secret) return;

  const schedule =
    process.env.BIRTHDAY_CRON_SCHEDULE?.trim() || "0 8 * * *";
  const timezone =
    process.env.BIRTHDAY_CRON_TIMEZONE?.trim() || "America/Sao_Paulo";

  const cron = (await import("node-cron")).default;

  cron.schedule(
    schedule,
    async () => {
      try {
        const result = await runBirthdayWebhooksForToday();
        console.info(
          `[cron][birthdays] sent=${result.sent} errors=${result.errors}`,
        );
      } catch (e) {
        console.error("[cron][birthdays]", e);
      }
    },
    { timezone },
  );

  console.info(`[cron] birthdays agendado: ${schedule} (${timezone})`);
}
