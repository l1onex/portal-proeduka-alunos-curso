-- Matrícula (apenas uso administrativo na app).

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS numero_matricula text;

COMMENT ON COLUMN public.proeduka_alunos.numero_matricula IS 'Número da matrícula (edição só admin).';
