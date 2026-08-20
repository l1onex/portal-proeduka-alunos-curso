-- Dados cadastrais adicionais: deficiência (Sim/Não), órgão expedidor do RG e estado civil.

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS possui_deficiencia text;

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS orgao_expedidor text;

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS estado_civil text;

COMMENT ON COLUMN public.proeduka_alunos.possui_deficiencia IS 'Possui deficiência: Sim ou Não.';
COMMENT ON COLUMN public.proeduka_alunos.orgao_expedidor IS 'Órgão expedidor do documento de identidade (ex.: SSP/SP).';
COMMENT ON COLUMN public.proeduka_alunos.estado_civil IS 'Estado civil conforme seleção do formulário.';
