-- Nível de escolaridade do aluno (campo opcional no cadastro).
-- Aplicado automaticamente no arranque do servidor via
-- `src/instrumentation-node.ts` (`runDatabaseMigrations`).

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS escolaridade text;

COMMENT ON COLUMN public.proeduka_alunos.escolaridade IS
  'Nível de escolaridade do aluno (Ensino fundamental/médio incompleto/completo, Ensino superior incompleto/completo). Texto livre — a UI sugere valores canónicos.';