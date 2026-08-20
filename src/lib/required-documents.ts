export const DOCUMENT_TYPES = [
  "identidade",
  "comprovante_residencia",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  identidade: "Identidade (RG)",
  comprovante_residencia: "Comprovante de residência",
};

export function pendingDocumentTypes(
  uploaded: Set<string>,
): DocumentType[] {
  return DOCUMENT_TYPES.filter((t) => !uploaded.has(t));
}

/** Uploads que disparam webhook `data_updated` (não inclui dados em texto). */
export const DOCUMENT_TYPES_DATA_UPDATED_WEBHOOK = new Set<DocumentType>([
  "identidade",
  "comprovante_residencia",
]);
