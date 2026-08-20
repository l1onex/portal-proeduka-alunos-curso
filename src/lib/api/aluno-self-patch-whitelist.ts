import {
  DOC_KEYS_ORDERED,
  EXTRA_ALUNO_PATCH_COLUMNS,
  INFO_KEYS_ORDERED,
  type InfoKey,
} from "@/lib/aluno-tabela";

/** Campos institucionais que o próprio aluno não altera pela ficha (igual aos readonly do formulário). */
export const STUDENT_READONLY_INFO_FIELDS = new Set<InfoKey>([
  "unidade",
  "consultor",
  "curso",
  "email",
]);

export function studentWritableInfoFields(): InfoKey[] {
  return INFO_KEYS_ORDERED.filter(
    (k) => !STUDENT_READONLY_INFO_FIELDS.has(k),
  );
}

/** Colunas permitidas em PATCH pelo aluno (`/api/aluno/dados`). */
export function buildAlunoStudentPatchColumnNames(): Set<string> {
  return new Set<string>([
    ...DOC_KEYS_ORDERED.map(String),
    ...studentWritableInfoFields().map(String),
    ...EXTRA_ALUNO_PATCH_COLUMNS.map(String),
    "naturalidade",
  ]);
}
