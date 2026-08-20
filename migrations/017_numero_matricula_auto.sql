-- Sequência de número de matrícula: começo em 2026210093; novos = +1 (atômico via SEQUENCE).
-- Não altera quem já tem `numero_matricula` preenchido; só preenche null ou string vazia.

-- 1) Preencher quem está sem matrícula (null ou vazio), em ordem de id.
WITH bounds AS (
  SELECT COALESCE(
    MAX(
      CASE
        WHEN numero_matricula IS NOT NULL
          AND length(trim(both from numero_matricula)) >= 10
          AND trim(both from numero_matricula) ~ '^[0-9]+$'
          AND (trim(both from numero_matricula))::bigint >= 2026000000
        THEN (trim(both from numero_matricula))::bigint
      END
    ),
    2026210092
  ) AS max_n
  FROM public.proeduka_alunos
),
numbered AS (
  SELECT a.id,
    (b.max_n + row_number() OVER (ORDER BY a.id))::text AS new_mat
  FROM public.proeduka_alunos AS a
  CROSS JOIN bounds AS b
  WHERE a.numero_matricula IS NULL OR trim(both from a.numero_matricula) = ''
)
UPDATE public.proeduka_alunos AS p
SET numero_matricula = n.new_mat
FROM numbered AS n
WHERE p.id = n.id;

-- 2) Sequência para novos números (concurrencia segura; nextval é atómico).
CREATE SEQUENCE IF NOT EXISTS public.proeduka_numero_matricula_seq
  INCREMENT BY 1
  MINVALUE 2026210093
  NO MAXVALUE
  START WITH 2026210093;

-- Sincronizar o “último” com o que já está na tabela (inclui o backfill acima).
-- À prova de banco vazio: o fallback 2026210092 fica abaixo do MINVALUE da
-- sequência, então usamos setval(..., false) para que o próximo nextval devolva
-- exatamente 2026210093 sem violar o limite inferior.
DO $$
DECLARE
  max_existing bigint;
BEGIN
  SELECT MAX(
    CASE
      WHEN numero_matricula IS NOT NULL
        AND length(trim(both from numero_matricula)) >= 10
        AND trim(both from numero_matricula) ~ '^[0-9]+$'
        AND (trim(both from numero_matricula))::bigint >= 2026000000
      THEN (trim(both from numero_matricula))::bigint
    END
  ) INTO max_existing
  FROM public.proeduka_alunos;

  IF max_existing IS NULL OR max_existing < 2026210093 THEN
    PERFORM setval('public.proeduka_numero_matricula_seq', 2026210093, false);
  ELSE
    PERFORM setval('public.proeduka_numero_matricula_seq', max_existing, true);
  END IF;
END $$;

-- 3) RPC usada pelo backend (service role).
CREATE OR REPLACE FUNCTION public.next_numero_matricula()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('public.proeduka_numero_matricula_seq')::text;
$$;

REVOKE ALL ON FUNCTION public.next_numero_matricula() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_numero_matricula() TO CURRENT_USER;

-- service_role só existe no Supabase; em Postgres direto o grant é ignorado.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.next_numero_matricula() TO service_role;
  END IF;
END $$;

COMMENT ON FUNCTION public.next_numero_matricula() IS
  'Próximo número de matrícula (sequência; mínimo 2026210093). Uso apenas pelo backend.';
