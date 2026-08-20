-- Adiciona a coluna `nome` em public.profiles e mantém sincronizada com `full_name`.
--
-- Necessário porque o código (admin-create-service.ts → upsert_staff_profile_by_id
-- com p_use_nome_column=true) escreve em `nome`, mas a migração 001 só criou
-- `full_name`. Sem esta coluna, criar master/admin falha com
-- `column "nome" of relation "profiles" does not exist`.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + backfill + trigger CREATE OR REPLACE.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome text;

-- Backfill para bases já existentes: copia full_name → nome nas linhas onde
-- nome ainda está NULL. Idempotente (segunda execução é no-op).
UPDATE public.profiles
SET nome = full_name
WHERE nome IS NULL
  AND full_name IS NOT NULL;

-- Trigger de sincronização: garante que qualquer INSERT/UPDATE em uma das
-- colunas propaga para a outra, mantendo ambas consistentes.
CREATE OR REPLACE FUNCTION public.profiles_sync_name_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.nome IS NOT NULL AND NEW.full_name IS NULL THEN
      NEW.full_name := NEW.nome;
    ELSIF NEW.full_name IS NOT NULL AND NEW.nome IS NULL THEN
      NEW.nome := NEW.full_name;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.nome IS DISTINCT FROM OLD.nome THEN
    NEW.full_name := NEW.nome;
  ELSIF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    NEW.nome := NEW.full_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_name_columns ON public.profiles;
CREATE TRIGGER profiles_sync_name_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_sync_name_columns();