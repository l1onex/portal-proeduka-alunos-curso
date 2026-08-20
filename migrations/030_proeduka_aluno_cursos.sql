-- Relação aluno ↔ curso.
-- Quando um admin atribui um curso a um aluno, cria-se uma linha aqui.
-- O `status` começa em 'a_cursar'. Quando o certificado do curso é emitido
-- (Fase 3), passa a 'concluido' com `concluido_em` preenchido.

CREATE TABLE IF NOT EXISTS public.proeduka_aluno_cursos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      uuid NOT NULL,
  curso_id      uuid NOT NULL,
  status        text NOT NULL DEFAULT 'a_cursar'
                  CHECK (status IN ('a_cursar', 'concluido')),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atribuido_por uuid,
  concluido_em  timestamptz,
  concluido_por uuid,

  CONSTRAINT proeduka_aluno_cursos_unique
    UNIQUE (aluno_id, curso_id)
);

CREATE INDEX IF NOT EXISTS proeduka_aluno_cursos_aluno_idx
  ON public.proeduka_aluno_cursos (aluno_id, status);

CREATE INDEX IF NOT EXISTS proeduka_aluno_cursos_curso_idx
  ON public.proeduka_aluno_cursos (curso_id);

COMMENT ON TABLE public.proeduka_aluno_cursos IS
  'Cursos atribuídos a cada aluno (atribuição manual feita pelo admin).';

COMMENT ON COLUMN public.proeduka_aluno_cursos.status IS
  'a_cursar | concluido (default a_cursar na criação).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proeduka_aluno_cursos TO PUBLIC;