import { NextResponse } from "next/server";

import type { DocKey, ExtraAlunoPatchColumn, InfoKey } from "@/lib/aluno-tabela";
import {
  DOC_KEYS_ORDERED,
  EXTRA_ALUNO_PATCH_COLUMNS,
  INFO_KEYS_ORDERED,
} from "@/lib/aluno-tabela";
import { getStudentSession } from "@/lib/api/student-session";
import { buildAlunoStudentPatchColumnNames } from "@/lib/api/aluno-self-patch-whitelist";
import { normalizeInfoForDb } from "@/lib/aluno-field-normalize";
import { getSql } from "@/lib/db/client";
import { sanitizedPublicTableName } from "@/lib/db/public-schema";

const INFO_LOOKUP = new Set<string>([
  ...INFO_KEYS_ORDERED.map(String),
  ...EXTRA_ALUNO_PATCH_COLUMNS.map(String),
]);
const DOC_LOOKUP = new Set<string>(DOC_KEYS_ORDERED.map(String));

function isTruthyInfoKey(col: string): col is InfoKey | ExtraAlunoPatchColumn {
  return INFO_LOOKUP.has(col);
}

function isDocKey(col: string): col is DocKey {
  return DOC_LOOKUP.has(col);
}

/** PATCH nos campos permitidos ao aluno na ficha própria. */
export async function PATCH(request: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const allowedCols = buildAlunoStudentPatchColumnNames();
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
      {
        error:
          "Nenhum campo permitido ou reconhecido no corpo da requisição.",
      },
      { status: 400 },
    );
  }

  delete patch.email;

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
    const studentIx = i;
    params.push(session.studentId);
    const q = `UPDATE public."${tableSql}" SET ${sets.join(", ")} WHERE id::text = $${studentIx} RETURNING id::text`;

    const out = await sql.unsafe<{ id: string }[]>(q, params);
    if (!out?.length) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[aluno dados PATCH]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
