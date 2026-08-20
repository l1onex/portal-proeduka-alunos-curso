import { maskCpfValidatorDisplay } from "@/lib/format-br";
import { isTruthyFlag } from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

export type ValidacaoResult =
  | { status: "invalid" }
  | { status: "not_approved"; nome: string | null; cpf_mascarado: string | null }
  | {
      status: "suspended_pending";
      nome: string | null;
      cpf_mascarado: string | null;
    }
  | {
      status: "valid";
      nome: string;
      numero_registro: string | null;
      cpf_mascarado: string | null;
    };

function isValidacaoSuspensaFlag(row: Record<string, unknown>): boolean {
  const v = row.validacao_suspensa;
  if (v === true || v === 1) return true;
  if (typeof v === "string" && v.trim().toLowerCase() === "true") return true;
  return false;
}

/**
 * Consulta por código (servidor apenas, ligação com bypass RLS como service role antes).
 */
export async function lookupCertificateByCode(
  rawCode: string,
): Promise<ValidacaoResult> {
  const code = rawCode.trim();
  if (!code) return { status: "invalid" };

  let sql;
  try {
    sql = getSql();
  } catch {
    return { status: "invalid" };
  }

  const fq = alunosFqn();
  let rows: Record<string, unknown>[];
  try {
    rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT nome, cpf, final, numero_registro, codigo_validacao, validacao_suspensa
       FROM ${fq} WHERE codigo_validacao::text = $1 LIMIT 1`,
      [code],
    );
  } catch {
    return { status: "invalid" };
  }

  const row = rows[0];
  if (!row) return { status: "invalid" };

  const nome =
    typeof row.nome === "string" ? row.nome.trim() : null;

  const cpf_mascarado = maskCpfValidatorDisplay(row.cpf);

  if (isValidacaoSuspensaFlag(row)) {
    return {
      status: "suspended_pending",
      nome: nome || null,
      cpf_mascarado,
    };
  }

  if (!isTruthyFlag(row.final)) {
    return {
      status: "not_approved",
      nome: nome || null,
      cpf_mascarado,
    };
  }

  return {
    status: "valid",
    nome: nome || "Aluno",
    numero_registro:
      typeof row.numero_registro === "string" && row.numero_registro.trim()
        ? row.numero_registro.trim()
        : null,
    cpf_mascarado,
  };
}
