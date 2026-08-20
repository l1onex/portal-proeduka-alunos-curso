import type { SqlQueryable } from "@/lib/db/client";
import type { RegistroEscolarAtribuido } from "@/lib/api/next-registro-escolar";
import { fetchNextRegistroEscolar } from "@/lib/api/next-registro-escolar";
import { alunoCardStatus, getAlunosTableName } from "@/lib/aluno-tabela";
import { alunosFqn } from "@/lib/db/alunos-table";

function positivePgIntAtLeast1(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const t = Math.trunc(v);
    return t >= 1 ? t : null;
  }
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isSafeInteger(n) && n >= 1 ? n : null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (s !== "" && /^\d+$/.test(s)) {
      const n = Number.parseInt(s, 10);
      return Number.isFinite(n) && n >= 1 ? n : null;
    }
  }
  return null;
}

export function needsRegistroEscolarAuto(row: Record<string, unknown>): boolean {
  const reg = row.numero_registro;
  let hasReg = false;
  if (typeof reg === "string" && reg.trim().length > 0) hasReg = true;
  else if (typeof reg === "number" && Number.isFinite(reg) && reg >= 1) hasReg = true;
  else if (typeof reg === "bigint" && reg >= BigInt(1)) hasReg = true;
  const hasLivro = positivePgIntAtLeast1(row.livro) !== null;
  const hasPag = positivePgIntAtLeast1(row.pagina) !== null;
  return !hasReg && !hasLivro && !hasPag;
}

export type EnsureRegistroEscolarResult =
  | { ok: true; assigned: false }
  | { ok: true; assigned: true; value: RegistroEscolarAtribuido }
  | { ok: false; error: string };

export type EnsureRegistroEscolarOpts = {
  /**
   * Valores sobrepões ao resultado do SELECT (ex.: timestamp do pedido de certificado neste mesmo request).
   * Evita o estado “aguardando_solicitação” quando uma outra conexão do pool ainda não vê o `UPDATE`.
   */
  rowOverrides?: Record<string, unknown>;
};

/**
 * Se o aluno está “em análise” e ainda não tem registo escolar, consome a sequência e grava os três campos.
 */
export async function ensureRegistroEscolarParaEmAnalise(
  service: SqlQueryable,
  studentId: string,
  opts?: EnsureRegistroEscolarOpts,
): Promise<EnsureRegistroEscolarResult> {
  void getAlunosTableName();
  const fq = alunosFqn();

  let row: Record<string, unknown> | null = null;
  try {
    const hits =
      await service.unsafe<Array<Record<string, unknown>>>(`
        SELECT *
        FROM ${fq}
        WHERE id::text = $1
        LIMIT 1
      `,
      [studentId.trim()],
    );
    row = hits[0] ?? null;
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Erro ao carregar dados do aluno.",
    };
  }

  if (!row) {
    return { ok: false, error: "Aluno não encontrado." };
  }

  const effective: Record<string, unknown> =
    opts?.rowOverrides && Object.keys(opts.rowOverrides).length > 0
      ? { ...row, ...opts.rowOverrides }
      : row;

  if (alunoCardStatus(effective) !== "em_analise") {
    return { ok: true, assigned: false };
  }
  if (!needsRegistroEscolarAuto(effective)) {
    return { ok: true, assigned: false };
  }  const regRes = await fetchNextRegistroEscolar(service);
  if (!regRes.ok) {
    return { ok: false, error: regRes.error };
  }

  try {
    const updated = await service.unsafe<Array<{ ok: boolean }>>(
      `UPDATE ${fq} SET numero_registro = $1, livro = $2, pagina = $3 WHERE id::text = $4 RETURNING true AS ok`,
      [
        regRes.value.numero_registro,
        regRes.value.livro,
        regRes.value.pagina,
        studentId.trim(),
      ],
    );
    if (!updated.length) {
      return { ok: false, error: "Falha ao gravar o registo escolar." };
    }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Falha ao gravar o registo escolar.",
    };
  }

  return { ok: true, assigned: true, value: regRes.value };
}
