import type { DocKey } from "@/lib/aluno-tabela";
import { FORMULARIO_MATRICULA_DOC_KEY } from "@/lib/matricula-form/constants";
import {
  avatarPathForStudent,
  studentFolderPath,
} from "@/lib/student-storage";

/** Slug estável no B2 (sem espaços) por tipo de documento. */
const DOC_B2_SLUG: Record<string, string> = {
  identidade: "identidade",
  "Comprovante de residência": "comprovante_residencia",
  [FORMULARIO_MATRICULA_DOC_KEY]: "formulario_matricula",
};

/**
 * Chave completa no bucket B2 para upload de um documento.
 * Foto 3x4 usa o mesmo padrão de avatar (`avatar.<ext>`).
 */
export function b2ObjectKeyForDoc(
  studentId: string,
  docKey:
    | DocKey
    | typeof FORMULARIO_MATRICULA_DOC_KEY
    | "Foto estilo 3x4",
  ext: string,
): string {
  const clean = ext.replace(/^\./, "").toLowerCase() || "pdf";
  if (docKey === "Foto estilo 3x4") {
    return avatarPathForStudent(studentId, clean);
  }
  const slug = DOC_B2_SLUG[docKey];
  return `${studentFolderPath(studentId)}/documents/${slug}.${clean}`;
}

/** Valor gravado na coluna da tabela após envio bem-sucedido. */
export function tableValueAfterUpload(): string {
  return "true";
}

/** Documento pendente / removido — só `true` conta como entregue. */
export function tableValueDocPending(): string {
  return "false";
}
