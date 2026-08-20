-- Data de expedição do documento de identidade (RG).

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS identidade_data_exp text;

COMMENT ON COLUMN public.proeduka_alunos.identidade_data_exp IS 'Data de expedição do RG (dd/mm/aaaa).';
