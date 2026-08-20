-- Naturalidade em duas colunas (UF + município); coluna `naturalidade` mantida como texto legado "CIDADE / UF".

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS naturalidade_uf text,
  ADD COLUMN IF NOT EXISTS naturalidade_cidade text;

COMMENT ON COLUMN public.proeduka_alunos.naturalidade_uf IS
  'UF de naturalidade (sigla de duas letras, ex.: SP).';

COMMENT ON COLUMN public.proeduka_alunos.naturalidade_cidade IS
  'Município de naturalidade (nome conforme IBGE).';

-- Backfill simples a partir de `naturalidade` no formato "CIDADE / UF" (primeira e segunda partes com split em "/")
UPDATE public.proeduka_alunos
SET
  naturalidade_cidade = upper(trim(split_part(naturalidade, '/', 1))),
  naturalidade_uf = upper(trim(split_part(naturalidade, '/', 2)))
WHERE naturalidade IS NOT NULL
  AND trim(naturalidade) <> ''
  AND naturalidade LIKE '%/%'
  AND (naturalidade_uf IS NULL OR trim(COALESCE(naturalidade_uf, '')) = '')
  AND (naturalidade_cidade IS NULL OR trim(COALESCE(naturalidade_cidade, '')) = '');
