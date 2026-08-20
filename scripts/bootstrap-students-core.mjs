/**
 * Bootstrap minimo da tabela base de alunos.
 * Permite rodar as migracoes incrementais em um banco vazio.
 */
export function getStudentsTableName(env = process.env) {
  return (
    env.NEXT_PUBLIC_ALUNOS_TABLE?.trim() ||
    env.NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE?.trim() ||
    "proeduka_alunos"
  );
}

export async function ensureStudentsTable(sql, env = process.env) {
  const tableName = getStudentsTableName(env);
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Nome da tabela de alunos inválido.");
  }

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public."${tableName}" (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      nome text,
      data text,
      unidade text,
      consultor text,
      curso text,
      dt_nasc text,
      cpf text,
      telefone text,
      rg text,
      nome_pai text,
      nome_mae text,
      profissao text,
      naturalidade_uf text,
      naturalidade_cidade text,
      naturalidade text,
      nacionalidade text,
      cep text,
      endereco text,
      numero text,
      complemento text,
      bairro text,
      cidade text,
      estado text,
      possui_deficiencia text,
      orgao_expedidor text,
      identidade_data_exp text,
      estado_civil text,
      form_pag text,
      homologado_em timestamptz,
      homologado_por text,
      sexo text,
      final boolean,
      validacao_suspensa boolean NOT NULL DEFAULT false,
      desistente boolean NOT NULL DEFAULT false,
      inadimplente boolean NOT NULL DEFAULT false,
      identidade text,
      "Comprovante de residência" text,
      "Foto estilo 3x4" text,
      "Certidão de nascimento ou casamento" text,
      "Histórico do Ensino Fundamental" text,
      "Formulário de matrícula preenchido e assinado" text,
      "pasta mae" text,
      "pasta documentos" text,
      "pasta certificado" text,
      numero_matricula text,
      codigo_validacao text,
      qr_certificado_url text,
      numero_registro text,
      livro integer,
      pagina integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Bancos antigos podem ter `final` como text; o contrato do app (e as
  // migrações) tratam-no como boolean (final = true / IS NULL / = false).
  // Converte de forma idempotente antes das migrações rodarem.
  await sql.unsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tableName}'
          AND column_name = 'final' AND data_type <> 'boolean'
      ) THEN
        ALTER TABLE public."${tableName}"
          ALTER COLUMN final DROP DEFAULT,
          ALTER COLUMN final TYPE boolean USING (
            CASE
              WHEN final IS NULL OR btrim(final::text) = '' THEN NULL
              WHEN lower(btrim(final::text)) IN ('true','t','1','sim','yes','y') THEN true
              ELSE false
            END
          );
      END IF;
    END $$;
  `);
}
