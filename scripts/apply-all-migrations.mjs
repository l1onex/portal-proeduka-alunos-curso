/**
 * Aplica todas as migrações SQL em `migrations/` contra DATABASE_URL.
 *
 * Uso:
 *   node --env-file=.env scripts/apply-all-migrations.mjs
 */
import { applyMigrationsFromDir, defaultMigrationsDir } from "./migration-runner.mjs";

const result = await applyMigrationsFromDir({
  migrationsDir: defaultMigrationsDir(),
});

console.log(
  `[pg] Migrações concluídas. applied=${result.applied} skipped=${result.skipped}`,
);
