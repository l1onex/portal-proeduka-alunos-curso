import { NextResponse } from "next/server";

import type { DocKey, ExtraAlunoPatchColumn, InfoKey } from "@/lib/aluno-tabela";
import {
  DOC_KEYS_ORDERED,
  EXTRA_ALUNO_PATCH_COLUMNS,
  INFO_KEYS_ORDERED,
} from "@/lib/aluno-tabela";
import { getStaffSession } from "@/lib/api/staff-session";
import { normalizeInfoForDb } from "@/lib/aluno-field-normalize";
import { getSql } from "@/lib/db/client";
import { sanitizedPublicTableName } from "@/lib/db/public-schema";

type Ctx = { params: Promise<{ id: string }> };

const INFO_LOOKUP = new Set<string>([
  ...INFO_KEYS_ORDERED.map(String),
  ...EXTRA_ALUNO_PATCH_COLUMNS.map(String),
]);
const DOC_LOOKUP = new Set<string>(DOC_KEYS_ORDERED.map(String));

const ADMIN_ONLY = new Set<string>([
  "form_pag",
  "numero_matricula",
]);

/** Colunas aceites na ficha quando o formulário está em modo admin. */
function adminAllowedColumns(): Set<string> {
  return new Set([
    ...INFO_KEYS_ORDERED.map(String),
    ...EXTRA_ALUNO_PATCH_COLUMNS.map(String),
    ...DOC_KEYS_ORDERED.map(String),
    "naturalidade",
    ...ADMIN_ONLY,
  ]);
}

function isTruthyInfoKey(col: string): col is InfoKey | ExtraAlunoPatchColumn {
  return INFO_LOOKUP.has(col);
}

function isDocKey(col: string): col is DocKey {
  return DOC_LOOKUP.has(col);
}

/** Equipa institucional atualiza dados completos na ficha (`/admin/...`). */
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const allowedCols = adminAllowedColumns();
  const patch: Record<string, string | number | null> = {};

  for (const [rawKey, rawVal] of Object.entries(body)) {
    if (!allowedCols.has(rawKey)) continue;

    if (rawKey === "naturalidade") {
      patch.naturalidade =
        rawVal === null || rawVal === undefined
          ? null
          : String(rawVal).trim().length === 0
            ? null
            : String(rawVal);
      continue;
    }

    if (ADMIN_ONLY.has(rawKey)) {
      if (rawKey === "numero_matricula" || rawKey === "form_pag") {
        patch[rawKey] =
          rawVal === null || rawVal === undefined
            ? null
            : String(rawVal).trim().length === 0
              ? null
              : String(rawVal).trim();
      }
      continue;
    }

    if (isTruthyInfoKey(rawKey)) {
      patch[rawKey] = normalizeInfoForDb(rawKey, String(rawVal ?? ""));
      continue;
    }

    if (isDocKey(rawKey)) {
      patch[rawKey] =
        rawVal === null || rawVal === undefined
          ? null
          : typeof rawVal === "string"
            ? rawVal.trim().length === 0
              ? null
              : rawVal.trim()
            : String(rawVal);
      continue;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo permitido no corpo." },
      { status: 400 },
    );
  }

  const tableSql = sanitizedPublicTableName();

  try {
    const sql = getSql();
    const entries = Object.entries(patch);
    const sets: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    let i = 1;
    for (const [col, val] of entries) {
      sets.push(`"${col}" = $${i}`);
      params.push(val);
      i++;
    }
    const idIx = i;
    params.push(studentId.trim());
    const q = `UPDATE public."${tableSql}" SET ${sets.join(", ")} WHERE id::text = $${idIx} RETURNING id::text`;

    const out = await sql.unsafe<{ id: string }[]>(q, params);
    if (!out?.length) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin ficha PATCH]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
