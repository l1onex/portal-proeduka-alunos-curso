-- Pedidos de certificado de curso.
-- Quando o aluno clica em "Solicitar certificado" no card de curso, cria-se
-- uma linha aqui com status = 'pendente'. O admin decide iniciar ou recusar
-- a partir da página /admin/certificados/solicitacoes.

CREATE TABLE IF NOT EXISTS public.proeduka_curso_pedidos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      uuid NOT NULL,
  curso_id      uuid NOT NULL,
  status        text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'iniciado', 'recusado')),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  decisao_em    timestamptz,
  decisao_por   uuid,
  motivo        text,

  -- Um aluno não pode ter mais do que um pedido pendente/iniciado por curso.
  CONSTRAINT proeduka_curso_pedidos_unique_active
    EXCLUDE (aluno_id WITH =, curso_id WITH =)
    WHERE (status IN ('pendente', 'iniciado'))
);

CREATE INDEX IF NOT EXISTS proeduka_curso_pedidos_status_idx
  ON public.proeduka_curso_pedidos (status, criado_em DESC);

CREATE INDEX IF NOT EXISTS proeduka_curso_pedidos_aluno_idx
  ON public.proeduka_curso_pedidos (aluno_id);

COMMENT ON TABLE public.proeduka_curso_pedidos IS
  'Pedidos de certificado feitos pelo aluno a partir do card "Cursos".';

COMMENT ON COLUMN public.proeduka_curso_pedidos.status IS
  'pendente | iniciado | recusado (default pendente).';

COMMENT ON COLUMN public.proeduka_curso_pedidos.motivo IS
  'Texto livre — quando o admin recusa ("Não iniciar"), pode justificar aqui.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proeduka_curso_pedidos TO PUBLIC;