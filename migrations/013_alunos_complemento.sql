-- Complemento de endereço (opcional), ex.: apto, bloco.
alter table public.proeduka_alunos
  add column if not exists complemento text;
