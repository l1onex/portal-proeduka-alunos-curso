-- Remove todas as colunas de notas disciplinares do fluxo.

ALTER TABLE public.proeduka_alunos
  DROP COLUMN IF EXISTS nota_lingua_portuguesa,
  DROP COLUMN IF EXISTS nota_artes,
  DROP COLUMN IF EXISTS nota_educacao_fisica,
  DROP COLUMN IF EXISTS nota_lingua_inglesa,
  DROP COLUMN IF EXISTS nota_lingua_espanhola,
  DROP COLUMN IF EXISTS nota_matematica,
  DROP COLUMN IF EXISTS nota_fisica,
  DROP COLUMN IF EXISTS nota_quimica,
  DROP COLUMN IF EXISTS nota_biologia,
  DROP COLUMN IF EXISTS nota_historia,
  DROP COLUMN IF EXISTS nota_geografia,
  DROP COLUMN IF EXISTS nota_sociologia,
  DROP COLUMN IF EXISTS nota_filosofia;
