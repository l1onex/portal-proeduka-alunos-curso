-- Exemplo de RLS para a tabela de alunos (nome: proeduka_alunos).
-- Executa depois de a tabela existir com coluna email.

ALTER TABLE public.proeduka_alunos ENABLE ROW LEVEL SECURITY;

-- Aluno lê só a própria linha (e-mail igual ao do utilizador autenticado)
CREATE POLICY "proeduka_alunos_select_own"
  ON public.proeduka_alunos FOR SELECT TO PUBLIC
  USING (
    lower(trim(coalesce(email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );

-- Staff lê todos os alunos
CREATE POLICY "proeduka_alunos_select_staff"
  ON public.proeduka_alunos FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'admin')
    )
  );

-- Aluno atualiza só a própria linha (para quando implementares uploads / formulário)
CREATE POLICY "proeduka_alunos_update_own"
  ON public.proeduka_alunos FOR UPDATE TO PUBLIC
  USING (
    lower(trim(coalesce(email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );

-- Staff atualiza qualquer linha (opcional)
CREATE POLICY "proeduka_alunos_update_staff"
  ON public.proeduka_alunos FOR UPDATE TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'admin')
    )
  );
