import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import { ensureAuthSchema } from "./bootstrap-auth-core.mjs";
import { ensureStudentsTable } from "./bootstrap-students-core.mjs";

export function defaultMigrationsDir() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "migrations");
}

function normalizeMigrationsDir(dir) {
  return path.isAbsolute(dir)
    ? dir
    : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
}

async function listSqlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function ensureMigrationsTable(sql) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.app_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function readAppliedMigrations(sql) {
  const rows = await sql`
    SELECT filename, checksum
    FROM public.app_migrations
    ORDER BY filename ASC
  `;

  const map = new Map();
  for (const row of rows) {
    const filename = typeof row.filename === "string" ? row.filename.trim() : "";
    const checksum = typeof row.checksum === "string" ? row.checksum.trim() : "";
    if (filename && checksum) {
      map.set(filename, checksum);
    }
  }
  return map;
}

async function applySingleMigration(sql, filename, fullPath, checksum) {
  const body = await fs.readFile(fullPath, "utf8");
  const currentChecksum = sha256Hex(body);
  if (currentChecksum !== checksum) {
    throw new Error(`Checksum divergente para ${filename}.`);
  }

  console.log("[pg] A aplicar:", filename);
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`
      INSERT INTO public.app_migrations (filename, checksum, applied_at)
      VALUES (${filename}, ${checksum}, now())
      ON CONFLICT (filename) DO UPDATE SET
        checksum = EXCLUDED.checksum,
        applied_at = EXCLUDED.applied_at
    `;
  });
}

/**
 * Aplica as migrações pendentes na pasta indicada.
 * Reaplica apenas o que ainda não existe em `public.app_migrations`.
 */
export async function applyMigrationsFromDir(params = {}) {
  const dbUrl = process.env.DATABASE_URL?.trim();
  const migrationsDir = normalizeMigrationsDir(
    params.migrationsDir ?? defaultMigrationsDir(),
  );

  if (!dbUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL não definido.");
    }
    console.warn("[pg] DATABASE_URL ausente; migrações ignoradas.");
    return { applied: 0, skipped: 0 };
  }

  const files = await listSqlFiles(migrationsDir);
  if (files.length === 0) {
    throw new Error(`Nenhuma migração encontrada em ${migrationsDir}`);
  }

  const sql = postgres(dbUrl, { max: 1 });
  try {
    await ensureAuthSchema(sql);
    await ensureStudentsTable(sql);
    await ensureMigrationsTable(sql);
    const applied = await readAppliedMigrations(sql);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const filename of files) {
      const fullPath = path.join(migrationsDir, filename);
      const body = await fs.readFile(fullPath, "utf8");
      const checksum = sha256Hex(body);
      const appliedChecksum = applied.get(filename);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(
            `Migração alterada após aplicação: ${filename}. Crie uma nova migração em vez de editar a antiga.`,
          );
        }
        skippedCount += 1;
        continue;
      }

      await applySingleMigration(sql, filename, fullPath, checksum);
      appliedCount += 1;
    }

    return { applied: appliedCount, skipped: skippedCount };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
