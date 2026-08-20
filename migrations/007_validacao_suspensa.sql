-- Bloqueio administrativo da validação pública (ex.: pagamento pendente), mesmo com certificado homologado.
ALTER TABLE public.proeduka_alunos
  ADD COLUMN IF NOT EXISTS validacao_suspensa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.proeduka_alunos.validacao_suspensa IS
  'Quando true, a validação pública (código/QR) não aceita o certificado como válido.';
