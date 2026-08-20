-- Situação administrativa: aluno desistiu do processo (cadastro em curso).
ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS desistente boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.proeduka_alunos.desistente IS
  'Quando true, o registo é tratado como desistente em vez de “em andamento”.';
