import type { SqlQueryable } from "@/lib/db/client";

export type RegistroEscolarAtribuido = {
  numero_registro: string;
  livro: number;
  pagina: number;
};

/** Postgres pode devolver colunas planas OU (versões antigas) um único jsonb. */
function pickRegistroFields(hit: Record<string, unknown>): {
  numero_registro: unknown;
  livro: unknown;
  pagina: unknown;
} {
  let numero_registro: unknown = hit.numero_registro;
  let livro: unknown = hit.livro;
  let pagina: unknown = hit.pagina;
  if (
    typeof numero_registro === "string" &&
    numero_registro.trim().length > 0 &&
    livro != null &&
    pagina != null
  ) {
    return { numero_registro, livro, pagina };
  }

  let rawNested: unknown = hit.next_registro_escolar;
  let obj: Record<string, unknown> | null = null;

  if (rawNested != null && typeof rawNested === "object" && !Array.isArray(rawNested)) {
    obj = rawNested as Record<string, unknown>;
  } else if (typeof rawNested === "string") {
    try {
      const parsed = JSON.parse(rawNested) as unknown;
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      obj = null;
    }
  }
  if (!obj) {
    for (const v of Object.values(hit)) {
      if (v != null && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        if (typeof o.numero_registro === "string") {
          obj = o;
          break;
        }
      }
      if (typeof v === "string") {
        try {
          const p = JSON.parse(v) as Record<string, unknown>;
          if (typeof p.numero_registro === "string") {
            obj = p;
            break;
          }
        } catch {
          /* seguinte valor */
        }
      }
    }
  }
  if (!obj) {
    return { numero_registro, livro, pagina };
  }

  return {
    numero_registro:
      typeof obj.numero_registro === "string" ? obj.numero_registro : numero_registro,
    livro: obj.livro ?? livro,
    pagina: obj.pagina ?? pagina,
  };
}

function parsePositiveInt(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === "string" && /^\s*\d+\s*$/.test(raw))
    return Math.trunc(Number.parseInt(raw.trim(), 10));
  return NaN;
}

/**
 * Próximo registo escolar via função Postgres `next_registro_escolar`.
 */
export async function fetchNextRegistroEscolar(
  service: SqlQueryable,
): Promise<
  { ok: true; value: RegistroEscolarAtribuido } | { ok: false; error: string }
> {
  try {
    const hits = await service.unsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM next_registro_escolar()`,
    );

    const o = hits[0];
    if (!o || typeof o !== "object") {
      return { ok: false, error: "Resposta inválida do registo escolar." };
    }
    const { numero_registro: nrRaw, livro: livRaw, pagina: pagRaw } =
      pickRegistroFields(o);
    const nr =
      nrRaw === null || nrRaw === undefined
        ? ""
        : typeof nrRaw === "string"
          ? nrRaw.trim()
          : String(nrRaw).trim();
    if (!nr) {
      return { ok: false, error: "Número de registo inválido." };
    }
    const liv = parsePositiveInt(livRaw);
    const pag = parsePositiveInt(pagRaw);
    if (!Number.isFinite(liv) || liv < 1) {
      return { ok: false, error: "Livro inválido." };
    }
    if (!Number.isFinite(pag) || pag < 1) {
      return { ok: false, error: "Página inválida." };
    }
    return {
      ok: true,
      value: {
        numero_registro: nr,
        livro: liv,
        pagina: pag,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Falha ao obter o registo escolar.",
    };
  }
}
