-- Número de registro (manual, ex-certificado), livro e página do registro escolar.
-- Idempotente e à prova de colisão: em bancos onde as migrações foram reaplicadas
-- (registros perdidos em app_migrations), a 004 recria `numero_certificado` vazia,
-- de modo que ela pode coexistir com `numero_registro`. Tratamos os três casos.

DO $$
DECLARE
  has_cert boolean;
  has_reg  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proeduka_alunos'
      AND column_name = 'numero_certificado'
  ) INTO has_cert;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proeduka_alunos'
      AND column_name = 'numero_registro'
  ) INTO has_reg;

  IF has_cert AND NOT has_reg THEN
    -- Caso normal (primeira aplicação): renomeia a coluna legada.
    ALTER TABLE public.proeduka_alunos
      RENAME COLUMN numero_certificado TO numero_registro;
  ELSIF has_cert AND has_reg THEN
    -- As duas colunas coexistem. Preserva qualquer dado da coluna legada sem
    -- sobrescrever o valor canônico e remove a duplicada.
    UPDATE public.proeduka_alunos
      SET numero_registro = numero_certificado
      WHERE numero_registro IS NULL
        AND numero_certificado IS NOT NULL;
    ALTER TABLE public.proeduka_alunos
      DROP COLUMN numero_certificado;
  END IF;
  -- Se apenas numero_registro existe, não há nada a fazer.
END $$;

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS livro integer
    CHECK (livro IS NULL OR livro >= 1);

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS pagina integer
    CHECK (pagina IS NULL OR (pagina >= 1 AND pagina <= 10000));

COMMENT ON COLUMN public.proeduka_alunos.numero_registro IS 'Número de registro (preenchimento manual; exibido na validação).';
COMMENT ON COLUMN public.proeduka_alunos.livro IS 'Livro do registro (admin).';
COMMENT ON COLUMN public.proeduka_alunos.pagina IS 'Página do registro (admin).';
