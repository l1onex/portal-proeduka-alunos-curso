-- Webhooks (somente master via API com service role).
-- Reset no painel Supabase (apaga dados): DROP TABLE public.webhook_endpoints CASCADE;

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_url_not_empty CHECK (length(trim(url)) > 0)
);

COMMENT ON TABLE public.webhook_endpoints IS
  'URLs de webhook cadastradas pelo master; events[]: birthday, data_updated (+ futuros).';

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_enabled ON public.webhook_endpoints (enabled);
