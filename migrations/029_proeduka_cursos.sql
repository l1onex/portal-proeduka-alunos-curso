-- Tabela `proeduka_cursos` — CRUD de cursos disponíveis para os alunos.
-- Cada curso tem nome, descrição e imagem (thumbnail estilo YouTube).
--
-- A coluna `image_key` guarda a key do Backblaze B2 (cursos/<id>-<hash>.<ext>).
-- A imagem é servida via URL pré-assinada (presign GET), gerada no momento
-- da leitura — não persistimos URL pública.

CREATE TABLE IF NOT EXISTS public.proeduka_cursos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  descricao     text,
  image_key     text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  criado_por    uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proeduka_cursos IS
  'Catálogo de cursos disponíveis para atribuição/solicitação pelos alunos.';

COMMENT ON COLUMN public.proeduka_cursos.nome IS
  'Nome público do curso (ex.: "Ensino Médio EJA").';

COMMENT ON COLUMN public.proeduka_cursos.descricao IS
  'Descrição do curso, em texto livre (markdown opcional).';

COMMENT ON COLUMN public.proeduka_cursos.image_key IS
  'Key do objeto no Backblaze B2 (ex.: cursos/<id>.jpg). Vazia = sem thumbnail.';

COMMENT ON COLUMN public.proeduka_cursos.criado_em IS
  'Momento de criação do registo.';

COMMENT ON COLUMN public.proeduka_cursos.criado_por IS
  'Auth user (staff) que criou o curso.';

COMMENT ON COLUMN public.proeduka_cursos.atualizado_em IS
  'Momento da última edição.';

-- Trigger para manter `atualizado_em` consistente.
CREATE OR REPLACE FUNCTION public.proeduka_cursos_touch_updated_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proeduka_cursos_touch_updated_em ON public.proeduka_cursos;
CREATE TRIGGER proeduka_cursos_touch_updated_em
  BEFORE UPDATE ON public.proeduka_cursos
  FOR EACH ROW
  EXECUTE FUNCTION public.proeduka_cursos_touch_updated_em();

-- Índice simples para listagens ordenadas por criação.
CREATE INDEX IF NOT EXISTS proeduka_cursos_criado_em_idx
  ON public.proeduka_cursos (criado_em DESC);

-- Grants para o role que a app usa (mesmo role das outras tabelas públicas).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proeduka_cursos TO PUBLIC;