-- Adiciona o status 'concluido' aos pedidos de certificado de curso.
-- Disparado quando o admin clica em "Iniciar certificação" numa solicitação:
-- nessa altura o certificado já é emitido, o curso do aluno fica 'concluido'
-- e o pedido entra em 'concluido' também.

ALTER TABLE public.proeduka_curso_pedidos
  DROP CONSTRAINT IF EXISTS proeduka_curso_pedidos_status_check;

ALTER TABLE public.proeduka_curso_pedidos
  ADD CONSTRAINT proeduka_curso_pedidos_status_check
  CHECK (status IN ('pendente', 'iniciado', 'recusado', 'concluido'))
  NOT VALID;

COMMENT ON COLUMN public.proeduka_curso_pedidos.status IS
  'pendente | iniciado | recusado | concluido (default pendente).';