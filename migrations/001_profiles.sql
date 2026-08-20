-- Executar no SQL Editor do Supabase (uma vez).
-- Perfis para master/admin (área administrativa). Alunos usam a tabela de alunos + Auth pelo e-mail.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('master', 'admin', 'student')),
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Se a tua base usa "nome" em vez de "full_name": ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome text;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ajustar políticas ao teu modelo; exemplo mínimo:
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO PUBLIC
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO PUBLIC
  USING (id = auth.uid());
