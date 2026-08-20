import type { StaffSession } from "@/lib/api/staff-session";
import type { StudentSession } from "@/lib/api/student-session";
import { getSql } from "@/lib/db/client";

const UUID =
  /^students\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;

/** Extrai o UUID do aluno a partir da chave `students/<uuid>/...`. */
export function parseStudentIdFromObjectKey(key: string): string | null {
  const m = UUID.exec(key.trim());
  return m ? m[1].toLowerCase() : null;
}

export function assertStudentKeyAllowed(
  key: string,
  staff: StaffSession | null,
  student: StudentSession | null,
  apiKeyFullAccess?: boolean,
): { ok: true } | { ok: false; error: string } {
  const sid = parseStudentIdFromObjectKey(key);
  if (!sid) {
    return { ok: false, error: "Chave inválida (use students/<id>/...)." };
  }
  if (staff) return { ok: true };
  if (apiKeyFullAccess) return { ok: true };
  if (student && student.studentId === sid) return { ok: true };
  return { ok: false, error: "Sem permissão para este arquivo." };
}

/**
 * Validação para chaves de objetos do tipo "cursos" (thumbnails do catálogo).
 * - Staff (master/admin) pode sempre.
 * - Aluno pode só se o curso estiver atribuído a ele (em `proeduka_aluno_cursos`).
 * A chave deve seguir o formato `cursos/<uuid>.<ext>`.
 */
const CURSO_KEY = /^cursos\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

/** Extrai o UUID do curso a partir da chave `cursos/<uuid>.<ext>`. */
export function parseCursoIdFromObjectKey(key: string): string | null {
  const m = CURSO_KEY.exec(key.trim());
  if (!m) return null;
  // Captura o UUID entre "cursos/" e ".<ext>".
  const inner = key.trim().split("/")[1] ?? "";
  const uuid = inner.split(".")[0] ?? "";
  return uuid.length === 36 ? uuid : null;
}

export async function assertCursoKeyAllowed(
  key: string,
  staff: StaffSession | null,
  student: StudentSession | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const k = key.trim();
  if (!CURSO_KEY.test(k)) {
    return {
      ok: false,
      error: "Chave inválida (use cursos/<uuid>.<ext>).",
    };
  }
  if (staff) return { ok: true };
  if (student) {
    const cursoId = parseCursoIdFromObjectKey(k);
    if (!cursoId) {
      return { ok: false, error: "Curso inválido." };
    }
    const sql = getSql();
    const rows = await sql<{ ok: number }[]>`
      SELECT 1 AS ok
      FROM public.proeduka_aluno_cursos
      WHERE aluno_id = ${student.studentId}::uuid
        AND curso_id = ${cursoId}::uuid
      LIMIT 1
    `;
    if (rows.length > 0) return { ok: true };
    return { ok: false, error: "Curso não atribuído a este aluno." };
  }
  return { ok: false, error: "Não autorizado." };
}

/**
 * Tenta primeiro validar como chave de aluno (compatibilidade) e, em
 * fallback, como chave de curso. Centraliza a lógica para upload, delete
 * e presign-get.
 */
export async function assertAnyAllowedKey(
  key: string,
  staff: StaffSession | null,
  student: StudentSession | null,
  apiKeyFullAccess?: boolean,
): Promise<
  | { ok: true; kind: "student" | "curso" }
  | { ok: false; error: string }
> {
  const studentOk = assertStudentKeyAllowed(
    key,
    staff,
    student,
    apiKeyFullAccess,
  );
  if (studentOk.ok) return { ok: true, kind: "student" };
  // Chave de curso: staff passa sempre; aluno só se estiver atribuído.
  const cursoOk = await assertCursoKeyAllowed(key, staff, student);
  if (cursoOk.ok) return { ok: true, kind: "curso" };
  // Devolve a mensagem mais útil: a do tipo "student" (mais comum).
  return { ok: false, error: studentOk.error };
}
