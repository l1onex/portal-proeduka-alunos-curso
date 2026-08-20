-- Registro escolar automático: número N/ANO (ano = ano corrente na atribuição), livro e página.
-- Regras: 3 registros por página; livro 2 da página 27 até 200; ao ultrapassar a página 200 do livro 2,
-- passa ao livro 3 com página 1; nos livros seguintes, páginas 1–200 (600 registros por livro).
-- Âncora: o registo 278 ocupa o livro 2, página 27 (índice i = N - 278).

CREATE OR REPLACE FUNCTION public.registro_escolar_livro_pagina(p_n bigint)
RETURNS TABLE(livro integer, pagina integer)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  WITH p AS (
    SELECT
      278::bigint AS anchor_n,
      2::int AS book_start,
      27::int AS first_page_book2,
      200::int AS max_page_per_book,
      3::int AS regs_per_page
  ),
  s AS (
    SELECT GREATEST(p_n - p.anchor_n, 0)::bigint AS i
    FROM p
  ),
  c AS (
    SELECT
      ((p.max_page_per_book - p.first_page_book2 + 1) * p.regs_per_page)::bigint AS book2_slots
    FROM p
  )
  SELECT
    CASE
      WHEN s.i < c.book2_slots THEN p.book_start
      ELSE (p.book_start + 1 + ((s.i - c.book2_slots) / (p.max_page_per_book * p.regs_per_page)))::int
    END AS livro,
    CASE
      WHEN s.i < c.book2_slots THEN
        (p.first_page_book2 + (s.i / p.regs_per_page))::int
      ELSE
        (1 + (((s.i - c.book2_slots) % (p.max_page_per_book * p.regs_per_page)) / p.regs_per_page))::int
    END AS pagina
  FROM s, c, p;
$$;

-- Sem backfill em massa: o registo escolar é atribuído pela app quando o aluno entra em “em análise”.

CREATE SEQUENCE IF NOT EXISTS public.proeduka_registro_global_n_seq
  AS bigint
  INCREMENT BY 1
  MINVALUE 278
  NO MAXVALUE
  START WITH 279;

SELECT setval(
  'public.proeduka_registro_global_n_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(
          CASE
            WHEN numero_registro IS NOT NULL
              AND length(trim(both from numero_registro)) > 0
              AND trim(both from numero_registro) ~ '^[0-9]+/[0-9]{4}$'
            THEN (split_part(trim(both from numero_registro), '/', 1))::bigint
          END
        )
        FROM public.proeduka_alunos
      ),
      278
    ),
    278
  ),
  true
);

CREATE OR REPLACE FUNCTION public.next_registro_escolar()
RETURNS jsonb
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
  RETURN jsonb_build_object(
    'numero_registro', n::text || '/' || y::text,
    'livro', lv,
    'pagina', pg
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registro_escolar_livro_pagina(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_registro_escolar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_registro_escolar() TO CURRENT_USER;

-- service_role só existe no Supabase; em Postgres direto o grant é ignorado.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.next_registro_escolar() TO service_role;
  END IF;
END $$;

COMMENT ON FUNCTION public.registro_escolar_livro_pagina(bigint) IS
  'Deriva livro e página a partir do número global do registo (âncora 278 = livro 2, pág. 27).';
COMMENT ON FUNCTION public.next_registro_escolar() IS
  'Próximo registo escolar: numero_registro N/ano, livro e página (sequência atómica). Uso pelo backend.';

COMMENT ON COLUMN public.proeduka_alunos.numero_registro IS
  'Número de registo N/ANO (gerado quando o cadastro passa a “em análise”; editável pelo admin).';
COMMENT ON COLUMN public.proeduka_alunos.livro IS
  'Livro do registo (inteiro na BD; exibir com zeros à esquerda, ex. 02).';
COMMENT ON COLUMN public.proeduka_alunos.pagina IS
  'Página do registo (inteiro na BD; exibir com zeros à esquerda, ex. 027).';
