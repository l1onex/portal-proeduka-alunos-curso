ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS nacionalidade text;

COMMENT ON COLUMN public.proeduka_alunos.nacionalidade IS
  'Nacionalidade do aluno (ex.: BRASILEIRA).';
