-- Certificado público: código de validação, número exibido e URL do QR no B2.
-- Executar no SQL Editor do Supabase (ajuste o nome da tabela se usar outro).

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS codigo_validacao text;

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS numero_certificado text;

ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS qr_certificado_url text;

-- Um código por aluno (quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_proeduka_alunos_codigo_validacao
  ON public.proeduka_alunos (codigo_validacao)
  WHERE codigo_validacao IS NOT NULL;

COMMENT ON COLUMN public.proeduka_alunos.codigo_validacao IS 'Código público (validador + QR).';
COMMENT ON COLUMN public.proeduka_alunos.numero_certificado IS 'Número do certificado exibido na conferência.';
COMMENT ON COLUMN public.proeduka_alunos.qr_certificado_url IS 'URL pública ou caminho do PNG do QR no B2.';
