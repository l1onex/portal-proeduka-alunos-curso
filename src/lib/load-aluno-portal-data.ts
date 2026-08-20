import { getStudentAvatarPresignedUrl } from "@/lib/b2/student-avatar-presign";
import { isTruthyFlag } from "@/lib/aluno-tabela";
import { alunosFqn } from "@/lib/db/alunos-table";
import { getSql } from "@/lib/db/client";

export async function loadAlunoPortalData(studentId: string): Promise<{
  rec: Record<string, unknown>;
  initialAvatarUrl: string | null;
} | null> {
  const sql = getSql();
  const fq = alunosFqn();
  const rows = await sql.unsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1`,
    [studentId.trim()],
  );
  const row = rows[0];
  if (!row) return null;

  const rec = row as Record<string, unknown>;

  let initialAvatarUrl: string | null = null;
  if (isTruthyFlag(rec["Foto estilo 3x4"])) {
    initialAvatarUrl = await getStudentAvatarPresignedUrl(studentId);
  }

  return { rec, initialAvatarUrl };
}
