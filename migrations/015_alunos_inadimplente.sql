-- Situação financeira (inadimplência) para filtros e relatórios administrativos.
ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS inadimplente boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.proeduka_alunos.inadimplente IS
  'Quando true, o aluno está marcado como inadimplente (pagamento ou outro critério interno).';
