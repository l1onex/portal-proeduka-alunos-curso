import {
  deleteAuthUserCascade,
  findAuthUserIdByEmail,
} from "@/lib/auth/auth-users-db";
import { getAlunosTableName } from "@/lib/aluno-tabela";
import type { Sql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

/**
 * Remove o aluno da tabela e tenta remover a conta no Auth pelo mesmo e-mail.
 */
export async function deleteStudentCascade(
  sql: Sql,
  studentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  void getAlunosTableName();
  const fq = alunosFqn();
  const sid = studentId.trim();

  let email = "";
  try {
    const rows = await sql.unsafe<Array<{ email: string | null }>>(
      `SELECT email::text AS email FROM ${fq} WHERE id::text = $1 LIMIT 1`,
      [sid],
    );
    const em = rows[0]?.email;
    email = typeof em === "string" ? em.trim().toLowerCase() : "";
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Falha ao localizar o aluno.",
    };
  }

  try {
    const del =
      await sql.unsafe<Array<{ id: string | null }>>(`DELETE FROM ${fq} WHERE id::text = $1 RETURNING id::text`, [
        sid,
      ]);
    if (!del?.length || !del[0]?.id) {
      return { ok: false, message: "Aluno não encontrado." };
    }
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Falha ao remover o cadastro.",
    };
  }

  if (email) {
    try {
      const userId = await findAuthUserIdByEmail(sql, email);
      if (userId) {
        await deleteAuthUserCascade(sql, userId);
      }
    } catch (e) {
      console.error("deleteStudentCascade auth:", e);
    }
  }

  return { ok: true };
}
