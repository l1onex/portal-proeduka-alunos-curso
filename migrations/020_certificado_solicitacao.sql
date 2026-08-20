-- Pedido explícito de certificado pelo aluno: só após isto o cadastro entra em “em análise”
-- (com `certificado_solicitado_em` preenchido). Registo escolar continua a ser gerado nessa fase.

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS certificado_solicitado_em timestamptz;

COMMENT ON COLUMN public.proeduka_alunos.certificado_solicitado_em IS
  'Preenchido quando o aluno conclui o fluxo “Solicitar certificado” no portal; necessário para figurar como em análise.';

-- Quem não estava aprovado volta a não ter pedido nem registo escolar atribuído automaticamente.
UPDATE public.proeduka_alunos
SET
  certificado_solicitado_em = NULL,
  numero_registro = NULL,
  livro = NULL,
  pagina = NULL
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

-- Notificações para administradores (leitura só via API com service role).
CREATE TABLE IF NOT EXISTS public.proeduka_staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  student_id uuid,
  student_name text,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS proeduka_staff_notifications_created_at_idx
  ON public.proeduka_staff_notifications (created_at DESC);

COMMENT ON TABLE public.proeduka_staff_notifications IS
  'Avisos para a equipa administrativa (ex.: pedido de certificado). Inserção via backend.';

ALTER TABLE public.proeduka_staff_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.proeduka_staff_notifications FROM PUBLIC;

-- service_role só existe no Supabase; em Postgres direto o grant é ignorado
-- (o dono da tabela — papel que aplica as migrações — mantém acesso total).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON public.proeduka_staff_notifications TO service_role;
  END IF;
END $$;
