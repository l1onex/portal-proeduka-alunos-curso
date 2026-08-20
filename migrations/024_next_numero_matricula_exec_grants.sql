-- Cadastro de alunos: garantir RPC + permissões quando NÃO há papel Supabase `service_role`
-- (Postgres próprio só com DATABASE_URL como `postgres` ou outro role genérico).
-- A migração 017 revogou EXECUTE ao PUBLIC — aqui volta a ficar disponível aos roles normais da app.

CREATE SEQUENCE IF NOT EXISTS public.proeduka_numero_matricula_seq
  INCREMENT BY 1
  MINVALUE 2026210093
  NO MAXVALUE
  START WITH 2026210093;

CREATE OR REPLACE FUNCTION public.next_numero_matricula()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('public.proeduka_numero_matricula_seq')::text;
$$;

COMMENT ON FUNCTION public.next_numero_matricula() IS
  'Próximo número de matrícula (sequência; mínimo 2026210093). Backend / cadastro admin.';

GRANT USAGE, SELECT ON SEQUENCE public.proeduka_numero_matricula_seq TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_numero_matricula() TO PUBLIC;
