-- Reverte preenchimento em massa do registo escolar para alunos que ainda não estão aprovados (`final`).
-- Mantém número de registo, livro e página de quem já tem certificado homologado (final = true).

UPDATE public.proeduka_alunos
SET numero_registro = NULL, livro = NULL, pagina = NULL
WHERE final IS DISTINCT FROM TRUE;

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
