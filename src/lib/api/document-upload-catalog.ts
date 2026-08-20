/**
 * Documentos enviados ao B2 em `students/<uuid>/documents/<slug>.<ext>`
 * (foto 3×4 usa `students/<uuid>/avatar.<ext>`).
 */
export type DocumentUploadCatalogItem = {
  /** Nome amigável */
  label: string;
  /** Coluna na tabela de alunos (PATCH após upload) */
  column_key: string;
  /** Ficheiro no B2 sem pasta (só o nome base antes da extensão) */
  b2_slug: string;
};

export const DOCUMENT_UPLOAD_CATALOG: DocumentUploadCatalogItem[] = [
  {
    label: "Identidade (RG)",
    column_key: "identidade",
    b2_slug: "identidade",
  },
  {
    label: "Comprovante de residência",
    column_key: "Comprovante de residência",
    b2_slug: "comprovante_residencia",
  },
];

/** Foto 3×4 — mesma chave que o avatar. */
export const FOTO_3X4_CATALOG = {
  label: "Foto estilo 3×4",
  column_key: "Foto estilo 3x4",
  note: "Chave B2: students/<uuid>/avatar.<jpg|jpeg|png|webp> (não usa pasta documents).",
} as const;

export function b2KeyForCatalogItem(
  studentId: string,
  slug: string,
  ext: string,
): string {
  const clean = ext.replace(/^\./, "").toLowerCase() || "pdf";
  return `students/${studentId}/documents/${slug}.${clean}`;
}
