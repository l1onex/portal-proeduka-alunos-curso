import { NextResponse } from "next/server";
import { sha256Hex } from "@/lib/api/api-key-crypto";
import { getSql } from "@/lib/db/client";

/** Extrai token de `Authorization: Bearer` ou `X-API-Key`. */
export function getApiKeyFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  const x = request.headers.get("x-api-key")?.trim();
  return x || null;
}

/**
 * Valida a chave contra a tabela `api_keys` e atualiza `last_used_at`.
 */
export async function verifyApiKeyRequest(request: Request): Promise<boolean> {
  const token = getApiKeyFromRequest(request);
  if (!token) return false;

  let sql;
  try {
    sql = getSql();
  } catch {
    return false;
  }

  const keyHash = sha256Hex(token);
  try {
    const hits =
      await sql<Array<{ id: string | null }>>`
        SELECT id::text AS id
        FROM public.api_keys
        WHERE key_hash = ${keyHash} AND enabled = TRUE
        LIMIT 1
      `;
    const row = hits[0];
    const id = row?.id?.trim();
    if (!id) return false;

    void sql`
      UPDATE public.api_keys
      SET last_used_at = now()
      WHERE id::text = ${id}
    `;
    return true;
  } catch {
    return false;
  }
}

/** Retorna `NextResponse` 401 se a chave for inválida; caso contrário `null`. */
export async function requireApiKey(
  request: Request,
): Promise<NextResponse | null> {
  const ok = await verifyApiKeyRequest(request);
  if (ok) return null;
  return NextResponse.json(
    {
      error:
        "Chave API inválida ou ausente. Envie Authorization: Bearer <pek_…> ou o header X-API-Key.",
    },
    { status: 401 },
  );
}
