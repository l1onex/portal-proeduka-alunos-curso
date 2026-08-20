-- Pedidos de curso: quando o aluno clica "Solicitar curso" no portal
-- (em /aluno/cursos), aparece um registo aqui. O admin decide liberar
-- (cria a linha em proeduka_aluno_cursos) ou recusar.

CREATE TABLE IF NOT EXISTS public.proeduka_curso_solicitacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      uuid NOT NULL,
  curso_id      uuid NOT NULL,
  status        text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  decisao_em    timestamptz,
  decisao_por   uuid,
  motivo        text,

  -- Um aluno não pode ter mais do que um pedido ativo por curso.
  CONSTRAINT proeduka_curso_solicitacoes_unique_active
    EXCLUDE (aluno_id WITH =, curso_id WITH =)
    WHERE (status = 'pendente')
);

CREATE INDEX IF NOT EXISTS proeduka_curso_solicitacoes_status_idx
  ON public.proeduka_curso_solicitacoes (status, criado_em DESC);

CREATE INDEX IF NOT EXISTS proeduka_curso_solicitacoes_aluno_idx
  ON public.proeduka_curso_solicitacoes (aluno_id);

CREATE INDEX IF NOT EXISTS proeduka_curso_solicitacoes_curso_idx
  ON public.proeduka_curso_solicitacoes (curso_id);

COMMENT ON TABLE public.proeduka_curso_solicitacoes IS
  'Pedidos do aluno para ser adicionado a um curso (liberação pelo admin).';

COMMENT ON COLUMN public.proeduka_curso_solicitacoes.status IS
  'pendente | aprovado | recusado (default pendente).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proeduka_curso_solicitacoes TO PUBLIC;