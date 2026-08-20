import postgres from "postgres";

import { sanitizedPublicTableName } from "@/lib/db/public-schema";

/**
 * DDL idempotente para `next_registro_escolar()` + sequência + livro/página.
 * Corre no arranque do servidor (instrumentation) com `DATABASE_URL`, para não depender
 * de correr SQL manualmente no painel / CLI (a imagem leva `migrations/`).
 *
 * Desligar: PROEDUKA_SKIP_REGISTRO_BOOTSTRAP=1
 */
function buildRegistroEscolarBootstrapSql(alunosTable: string): string {
  return `
CREATE SEQUENCE IF NOT EXISTS public.proeduka_registro_global_n_seq
  AS bigint
  INCREMENT BY 1
  MINVALUE 278
  NO MAXVALUE
  START WITH 279;

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

REVOKE ALL ON FUNCTION public.registro_escolar_livro_pagina(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_registro_escolar() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.next_registro_escolar() TO CURRENT_USER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.next_registro_escolar() TO service_role;
  END IF;
END $$;

COMMENT ON FUNCTION public.registro_escolar_livro_pagina(bigint) IS
  '278 = livro 2 pág. 26 (único). 279+ = trios na pág. 27…200 do livro 2; depois livro 3+ com pág. 1…200.';
COMMENT ON FUNCTION public.next_registro_escolar() IS
  'Próximo registo escolar: N/ANO, livro e página.';

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
        FROM public."${alunosTable}"
      ),
      278
    ),
    278
  ),
  true
);
`.trim();
}

export async function bootstrapRegistroEscolarSchema(): Promise<void> {
  if (process.env.PROEDUKA_SKIP_REGISTRO_BOOTSTRAP === "1") {
    console.info("[proeduka][registro-bootstrap] ignorado (PROEDUKA_SKIP_REGISTRO_BOOTSTRAP=1).");
    return;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.warn(
      "[proeduka][registro-bootstrap] SKIP: DATABASE_URL não definido (registo escolar só após configurar BD).",
    );
    return;
  }

  let table: string;
  try {
    table = sanitizedPublicTableName();
  } catch {
    console.warn("[proeduka][registro-bootstrap] SKIP: nome da tabela de alunos inválido no env.");
    return;
  }

  const sqlConn = postgres(url, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 30,
    /** NOTICE esperado do DROP IF EXISTS quando o objeto ainda não existia — não é erro. */
    onnotice: (n) => {
      const msg = typeof n.message === "string" ? n.message : String(n ?? "");
      if (/does not exist, skipping/i.test(msg)) return;
      console.warn("[postgres][notice]", msg);
    },
  });
  try {
    console.info("[proeduka][registro-bootstrap] a garantir sequência + next_registro_escolar() …");
    await sqlConn.unsafe(buildRegistroEscolarBootstrapSql(table));
    console.info("[proeduka][registro-bootstrap] OK.");
  } finally {
    await sqlConn.end({ timeout: 5 });
  }
}
