-- Login e criação de staff não usam JWT do Supabase (`auth.uid()` é NULL nas ligações
-- do servidor). Com RLS em `public.profiles`, o JOIN omitia `role` ⇒ login de admin
-- caía no fluxo “aluno” e devolvia no_student_record.
--
-- Execução: uma vez na base (postgres ou papel com CREATE FUNCTION).
-- O owner da função deve ser um papel que passe RLS ao ler/inserir em profiles.

CREATE OR REPLACE FUNCTION public.profile_role_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text FROM public.profiles p WHERE p.id = p_user_id LIMIT 1;
$$;

COMMENT ON FUNCTION public.profile_role_for_user(uuid) IS
  'Devolve profiles.role ignorando RLS (apenas servidor / login).';

-- Upsert utilizado pela API ao criar master/admin — funciona mesmo com RLS a bloquear INSERT/UPDATE directos pelo papel da app.
CREATE OR REPLACE FUNCTION public.upsert_staff_profile_by_id(
  p_id uuid,
  p_email text,
  p_staff_role text,
  p_full_name text,
  p_use_nome_column boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_staff_role NOT IN ('master', 'admin') THEN
    RAISE EXCEPTION 'upsert_staff_profile_by_id: papel inválido';
  END IF;

  IF p_use_nome_column THEN
    INSERT INTO public.profiles AS pr (id, email, role, nome, created_at, updated_at)
    VALUES (p_id, lower(trim(p_email)), p_staff_role, p_full_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      nome = EXCLUDED.nome,
      updated_at = now();
  ELSE
    INSERT INTO public.profiles AS pr (id, email, role, full_name, created_at, updated_at)
    VALUES (p_id, lower(trim(p_email)), p_staff_role, p_full_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      updated_at = now();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.upsert_staff_profile_by_id(uuid, text, text, text, boolean) IS
  'Cria/atualiza linha staff em profiles (nome vs full_name) ignorando RLS.';

-- Listagens onde RLS omitiria perfis doutros utilizadores (painel equipa / certificados).
CREATE OR REPLACE FUNCTION public.list_staff_profiles_for_admin_ui()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.role IN ('master', 'admin')
  ORDER BY p.created_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.profiles_rows_by_ids(p_ids uuid[])
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p_ids IS NOT NULL
    AND array_length(p_ids, 1) IS NOT NULL
    AND p.id = ANY (p_ids);
$$;
