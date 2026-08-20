-- Chaves de API para integrações externas (Bearer). CRUD só via API admin com service role.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT api_keys_hash_unique UNIQUE (key_hash),
  CONSTRAINT api_keys_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE public.api_keys IS
  'Chaves API (hash SHA-256); valor completo mostrado só na criação.';

CREATE INDEX IF NOT EXISTS idx_api_keys_enabled ON public.api_keys (enabled);
