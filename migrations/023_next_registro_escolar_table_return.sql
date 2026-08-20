-- `next_registro_escolar()` passou a devolver uma linha com 3 colunas em vez de JSONB único:
-- assim `SELECT * FROM next_registro_escolar()` mapeia corretamente numero_registro, livro, pagina
-- nos clientes Postgres (antes surgia só um campo tipo json).

DROP FUNCTION IF EXISTS public.next_registro_escolar();

CREATE OR REPLACE FUNCTION public.next_registro_escolar()
RETURNS TABLE(numero_registro text, livro integer, pagina integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
  y int;
  lv int;
  pg int;
BEGIN
  n := nextval('public.proeduka_registro_global_n_seq');
  y := EXTRACT(YEAR FROM NOW())::int;
  SELECT r.livro, r.pagina INTO lv, pg
  FROM public.registro_escolar_livro_pagina(n) AS r;
  RETURN QUERY SELECT (n::text || '/' || y::text)::text, lv, pg;
END;
$$;

REVOKE ALL ON FUNCTION public.next_registro_escolar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_registro_escolar() TO CURRENT_USER;

-- service_role só existe no Supabase; em Postgres direto o grant é ignorado.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.next_registro_escolar() TO service_role;
  END IF;
END $$;

COMMENT ON FUNCTION public.next_registro_escolar() IS
  'Próximo registo escolar: N/ANO, livro e página (3 registos por pág.; âncoras em registro_escolar_livro_pagina).';
