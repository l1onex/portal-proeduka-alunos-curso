import type { Sql } from "@/lib/db/client";
import { quotePgColumnIdentifier } from "@/lib/db/quote-pg-col";
import {
  canEditValidacaoSuspensa,
  DOC_KEYS_ORDERED,
  getAlunosTableName,
  INFO_KEYS_ORDERED,
  type InfoKey,
} from "@/lib/aluno-tabela";
import { normalizeInfoForDb } from "@/lib/aluno-field-normalize";
import { ensureRegistroEscolarParaEmAnalise } from "@/lib/api/ensure-registro-escolar-em-analise";
import { deriveNaturalidadeText } from "@/lib/naturalidade-derive";
import { alunosFqn } from "@/lib/db/alunos-table";

const EXTRA_KEYS = new Set<string>([
  "form_pag",
  "numero_matricula",
  "validacao_suspensa",
  "final",
  /** Texto derivado quando `naturalidade_uf` ou `naturalidade_cidade` mudam — normalmente não enviar no PATCH. */
  "naturalidade",
]);

const DOC_SET = new Set<string>(DOC_KEYS_ORDERED as unknown as string[]);
const INFO_SET = new Set<string>(INFO_KEYS_ORDERED as unknown as string[]);

const ALL_PATCH_KEYS = new Set<string>([
  ...INFO_SET,
  ...DOC_SET,
  ...EXTRA_KEYS,
]);

export function listStudentPatchableKeys(): string[] {
  return [...ALL_PATCH_KEYS].sort();
}

type PatchResult =
  | { ok: true; patch: Record<string, string | number | boolean | null> }
  | { ok: false; status: number; error: string };

/**
 * Monta o objeto de atualização a partir do JSON (chaves = colunas da tabela).
 */
export function buildStudentPatchFromJson(
  body: Record<string, unknown>,
  existingRow: Record<string, unknown>,
): PatchResult {
  const patch: Record<string, string | number | boolean | null> = {};

  for (const key of Object.keys(body)) {
    if (!ALL_PATCH_KEYS.has(key)) continue;

    if (key === "validacao_suspensa") {
      const v = body[key];
      if (typeof v !== "boolean") {
        return {
          ok: false,
          status: 400,
          error: "validacao_suspensa deve ser true ou false.",
        };
      }
      if (!canEditValidacaoSuspensa(existingRow)) {
        return {
          ok: false,
          status: 400,
          error:
            "Só é possível alterar validacao_suspensa quando o cadastro está completo (documentos e dados de certificação).",
        };
      }
      patch.validacao_suspensa = v;
      continue;
    }

    if (DOC_SET.has(key)) {
      const raw = body[key];
      if (raw === null || raw === undefined) {
        patch[key] = null;
        continue;
      }
      if (typeof raw === "boolean") {
        patch[key] = raw ? "true" : "false";
        continue;
      }
      if (typeof raw === "string") {
        const t = raw.trim().toLowerCase();
        if (t === "true" || t === "1" || t === "sim") patch[key] = "true";
        else if (t === "false" || t === "0" || t === "nao" || t === "não") {
          patch[key] = "false";
        } else {
          patch[key] = raw;
        }
        continue;
      }
      patch[key] = String(raw);
      continue;
    }

    if (INFO_SET.has(key)) {
      const raw = body[key];
      if (raw === null || raw === undefined) {
        patch[key] = null;
        continue;
      }
      const str = typeof raw === "string" ? raw : String(raw);
      const infoKey = key as InfoKey;
      patch[key] = normalizeInfoForDb(infoKey, str);
      continue;
    }

    if (
      key === "form_pag" ||
      key === "numero_matricula"
    ) {
      const raw = body[key];
      if (raw === null || raw === undefined || raw === "") {
        patch[key] = null;
        continue;
      }
      patch[key] = typeof raw === "string" ? raw.trim() : String(raw);
      continue;
    }

    if (key === "final") {
      const raw = body[key];
      if (raw === null || raw === undefined || raw === "") {
        patch[key] = null;
        continue;
      }
      patch[key] = typeof raw === "string" ? raw.trim() : String(raw);
    }
  }

  const natMerge =
    Object.prototype.hasOwnProperty.call(body, "naturalidade_uf") ||
    Object.prototype.hasOwnProperty.call(body, "naturalidade_cidade") ||
    Object.prototype.hasOwnProperty.call(patch, "naturalidade_uf") ||
    Object.prototype.hasOwnProperty.call(patch, "naturalidade_cidade");
  if (natMerge) {
    const uf =
      patch.naturalidade_uf !== undefined
        ? patch.naturalidade_uf
        : existingRow["naturalidade_uf"];
    const cid =
      patch.naturalidade_cidade !== undefined
        ? patch.naturalidade_cidade
        : existingRow["naturalidade_cidade"];
    patch.naturalidade = deriveNaturalidadeText(
      uf === null || uf === undefined ? "" : String(uf),
      cid === null || cid === undefined ? "" : String(cid),
    );
  }

  if (Object.keys(patch).length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        "Nenhum campo reconhecido. Use chaves da tabela (ex.: nome, cpf, telefone, validacao_suspensa).",
    };
  }

  return { ok: true, patch };
}

export async function fetchStudentRow(
  sql: Sql,
  studentId: string,
): Promise<Record<string, unknown> | null> {
  void getAlunosTableName();
  const fq = alunosFqn();
  try {
    const rows =
      await sql.unsafe<Array<Record<string, unknown>>>(`
        SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1`,
      [studentId.trim()],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function applyStudentPatch(
  sql: Sql,
  studentId: string,
  patch: Record<string, string | number | boolean | null>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  void getAlunosTableName();
  const fq = alunosFqn();
  const entries = Object.entries(patch);
  if (!entries.length) return { ok: true };

  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let i = 1;
  for (const [col, val] of entries) {
    sets.push(`${quotePgColumnIdentifier(col)} = $${i}`);
    params.push(val);
    i++;
  }
  params.push(studentId.trim());
  try {
    const q = `
      UPDATE ${fq}
      SET ${sets.join(", ")}
      WHERE id::text = $${i}
      RETURNING id::text`;

    const out = await sql.unsafe<Array<{ id: string | null }>>(q, params);
    if (!out?.length)
      return { ok: false, message: "Aluno não encontrado ou sem alterações." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao atualizar aluno.",
    };
  }

  const reg = await ensureRegistroEscolarParaEmAnalise(sql, studentId);
  if (!reg.ok) {
    console.error(
      "[applyStudentPatch] ensureRegistroEscolarParaEmAnalise:",
      reg.error,
    );
  }
  return { ok: true };
}
