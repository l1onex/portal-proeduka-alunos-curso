-- Tutoriais em vídeo (YouTube / Vimeo). CRUD só via API com service role (master).

CREATE TABLE IF NOT EXISTS public.tutorial_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  thumbnail_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tutorial_videos_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT tutorial_videos_url_not_empty CHECK (length(trim(video_url)) > 0)
);

COMMENT ON TABLE public.tutorial_videos IS
  'Vídeos tutoriais cadastrados pelo master; alunos autenticados podem listar (RLS SELECT).';

CREATE INDEX IF NOT EXISTS idx_tutorial_videos_sort ON public.tutorial_videos (sort_order, created_at DESC);

ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutorial_videos_select_authenticated"
  ON public.tutorial_videos FOR SELECT TO PUBLIC
  USING (true);
