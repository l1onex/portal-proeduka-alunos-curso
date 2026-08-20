-- Ajuste do livro/página: o registo 278 fica sozinho no livro 2, página 26.
-- A partir do 279: 3 registos por página, começando na página 27 até 200 do livro 2;
-- depois livro 3 página 1, etc. (600 registos por livro completo).
-- A função devolve inteiros (livro 2, página 27). Na interface, formatar como "02", "027"
-- (ver `formatRegistroLivroDisplay` / `formatRegistroPaginaDisplay` em `src/lib/format-br.ts`).

CREATE OR REPLACE FUNCTION public.registro_escolar_livro_pagina(p_n bigint)
RETURNS TABLE(livro integer, pagina integer)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  WITH p AS (
    SELECT
      278::bigint AS n_278,
      279::bigint AS n_first_trio,
      2::int AS book_start,
      26::int AS page_for_278,
      27::int AS first_trio_page,
      200::int AS max_page_per_book,
      3::int AS regs_per_page,
      ((200 - 27 + 1) * 3)::bigint AS j_count_book2_from_279
  ),
  s AS (
    SELECT
      p.*,
      CASE
        WHEN p_n < p.n_278 THEN NULL::bigint
        WHEN p_n = p.n_278 THEN (-1)::bigint
        ELSE (p_n - p.n_first_trio)::bigint
      END AS j
    FROM p
  )
  SELECT
    CASE
      WHEN s.j IS NULL OR s.j = -1 THEN s.book_start
      WHEN s.j < s.j_count_book2_from_279 THEN s.book_start
      ELSE
        (s.book_start + 1 + ((s.j - s.j_count_book2_from_279) / (s.max_page_per_book * s.regs_per_page)))::int
    END AS livro,
    CASE
      WHEN s.j IS NULL THEN s.page_for_278
      WHEN s.j = -1 THEN s.page_for_278
      WHEN s.j < s.j_count_book2_from_279 THEN
        (s.first_trio_page + (s.j / s.regs_per_page))::int
      ELSE
        (1 + (((s.j - s.j_count_book2_from_279) % (s.max_page_per_book * s.regs_per_page)) / s.regs_per_page))::int
    END AS pagina
  FROM s;
$$;

COMMENT ON FUNCTION public.registro_escolar_livro_pagina(bigint) IS
  '278 = livro 2 pág. 26 (único). 279+ = trios na pág. 27…200 do livro 2; depois livro 3+ com pág. 1…200.';

-- Garantir que o próximo nextval continua depois do maior N já gravado (mínimo 278 → próximo 279).
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
