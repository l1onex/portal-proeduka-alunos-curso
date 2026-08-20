import { getAlunosTableName } from "@/lib/aluno-tabela";

/** Identificador `public.<tabela>` com validação mínima (evita interpolação insegura). */
export function sanitizedPublicTableName(): string {
  const raw = getAlunosTableName().trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw)) {
    throw new Error(
      "NEXT_PUBLIC_ALUNOS_TABLE ou NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE / identificador de tabela inválido (use só letras, números e _).",
    );
  }
  return raw;
}
