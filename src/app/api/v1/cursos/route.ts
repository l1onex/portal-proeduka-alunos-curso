import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/api/verify-api-key";
import { listCursos } from "@/lib/api/cursos";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";

/**
 * GET /api/v1/cursos
 *
 * Lista todos os cursos do sistema (`proeduka_cursos`).
 * Autenticação: API Key (`pek_…`) via `Authorization: Bearer` ou `X-API-Key`.
 *
 * Query params (todos opcionais):
 *   - `q`        busca textual por nome (ILIKE)
 *   - `limit`    default 50, máximo 200
 *   - `offset`   default 0
 *
 * Resposta: `{ cursos: [...], limit, offset }`. Cada curso já vem com
 * `image_url` (URL pré-assinada para download B2, 1h) — basta exibir.
 *
 * **curl**\n```bash
 * curl -sS -H "Authorization: Bearer $PEK" "https://host/api/v1/cursos?q=ensino"
 * ```
 */
export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  let limit = Number.parseInt(limitRaw ?? "50", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;
  let offset = Number.parseInt(offsetRaw ?? "0", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  try {
    let rows = await listCursos();
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((r) => r.nome.toLowerCase().includes(needle));
    }
    rows = rows.slice(offset, offset + limit);

    const cursos = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        image_url: await getSignedStorageUrl(r.image_key),
      })),
    );
    return NextResponse.json({ cursos, limit, offset, total: rows.length });
  } catch (e) {
    console.error("[api/v1/cursos GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar cursos." },
      { status: 500 },
    );
  }
}