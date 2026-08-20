import type { DocumentType } from "@/lib/required-documents";

/** Prefixo lógico das chaves no B2 (mesmo padrão de pastas do projeto). */
export const STUDENT_STORAGE_PREFIX = "students";

/** Pasta raiz do aluno: `students/<uuid>/` */
export function studentFolderPath(studentId: string): string {
  return `${STUDENT_STORAGE_PREFIX}/${studentId}`;
}

export function avatarPathForStudent(studentId: string, ext: string): string {
  const clean = ext.replace(/^\./, "").toLowerCase() || "jpg";
  return `${studentFolderPath(studentId)}/avatar.${clean}`;
}

/**
 * Extensões a apagar ao trocar ou remover a foto — evita vários `avatar.*`
 * no bucket (ex.: era.jpg e novo.png). Mantém `webp` só para órfãos antigos.
 */
export const AVATAR_B2_EXTENSIONS_FOR_PURGE = [
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export type AvatarStoragePurgeExt = (typeof AVATAR_B2_EXTENSIONS_FOR_PURGE)[number];

export function allAvatarStorageKeys(studentId: string): string[] {
  return AVATAR_B2_EXTENSIONS_FOR_PURGE.map((ext) =>
    avatarPathForStudent(studentId, ext),
  );
}

/** Chaves `students/<uuid>/avatar.<ext>` para validação nas APIs do B2. */
const AVATAR_OBJECT_KEY_RE =
  /^students\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/avatar\.([a-z0-9]+)$/i;

export function parseAvatarObjectKey(key: string): {
  studentId: string;
  ext: string;
} | null {
  const m = AVATAR_OBJECT_KEY_RE.exec(key.trim());
  if (!m) return null;
  return { studentId: m[1].toLowerCase(), ext: m[2].toLowerCase() };
}

/** Extensões aceites no upload da foto 3×4 — apenas JPG e PNG (JPEG inclusive). */
export const PHOTO_AVATAR_UPLOAD_EXTS = new Set(["jpg", "jpeg", "png"]);

/** Valida extensão e Content-Type declarado para foto de perfil (`avatar.<ext>`). */
export function assertAvatarPhotoAllowed(
  avatarExt: string,
  mime: string,
): { ok: true } | { ok: false; error: string } {
  if (!PHOTO_AVATAR_UPLOAD_EXTS.has(avatarExt)) {
    return {
      ok: false,
      error: "Foto do perfil: envie apenas arquivo JPG ou PNG.",
    };
  }
  const ct = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  const mimeOk =
    ct === "" ||
    ct === "application/octet-stream" ||
    ct === "image/jpeg" ||
    ct === "image/jpg" ||
    ct === "image/png";
  if (!mimeOk) {
    return {
      ok: false,
      error: "Foto do perfil: use imagem JPG ou PNG.",
    };
  }
  return { ok: true };
}

export function documentPathForStudent(
  studentId: string,
  type: DocumentType,
  ext: string,
): string {
  const clean = ext.replace(/^\./, "").toLowerCase() || "pdf";
  return `${studentFolderPath(studentId)}/documents/${type}.${clean}`;
}
