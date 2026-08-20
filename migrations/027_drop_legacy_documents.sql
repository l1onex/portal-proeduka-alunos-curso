-- Remove colunas legadas de documentos antigos.

ALTER TABLE public.proeduka_alunos
  DROP COLUMN IF EXISTS "Título de eleitor",
  DROP COLUMN IF EXISTS "Reservista";
