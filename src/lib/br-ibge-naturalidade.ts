/** UFs do Brasil (siglas) para naturalidade. */
export const BR_UF_SIGLAS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type BrasilUf = (typeof BR_UF_SIGLAS)[number];

const IBGE_MUNICIPIOS_CACHE = new Map<
  string,
  { fetchedAt: number; nomes: string[] }
>();

const CACHE_MS = 1000 * 60 * 60 * 24;

/**
 * Lista de nomes oficiais de municípios (ordenado), cacheada em memória.
 * Fonte: API IBGE (requer rede no servidor ou no cliente).
 */
export async function fetchIbgeMunicipiosNomes(
  uf: string,
): Promise<string[]> {
  const sigla = uf.trim().toUpperCase();
  if (!/^([A-Z]{2})$/.test(sigla)) return [];

  const now = Date.now();
  const hit = IBGE_MUNICIPIOS_CACHE.get(sigla);
  if (hit && now - hit.fetchedAt < CACHE_MS) return hit.nomes;

  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(sigla)}/municipios`,
    { cache: "default" },
  );
  if (!res.ok) {
    throw new Error(`IBGE: ${res.status}`);
  }
  const data = (await res.json()) as { nome?: string }[];
  if (!Array.isArray(data)) throw new Error("Resposta IBGE inválida.");
  const nomes = data
    .map((x) => (typeof x.nome === "string" ? x.nome.trim() : ""))
    .filter(Boolean)
    .sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
    );
  IBGE_MUNICIPIOS_CACHE.set(sigla, { fetchedAt: now, nomes });
  return nomes;
}

/** Interpreta valores antigos tipo "SÃO PAULO / SP". */
export function parseLegacyNaturalidadeText(
  raw: string,
): { naturalidade_cidade: string; naturalidade_uf: string } | null {
  const t = raw.trim();
  if (!t || !t.includes("/")) return null;
  const idx = t.lastIndexOf("/");
  const cidade = t.slice(0, idx).trim();
  const uf = t.slice(idx + 1).trim().toUpperCase();
  if (cidade.length === 0 || !/^[A-Z]{2}$/i.test(uf)) return null;
  return {
    naturalidade_cidade: cidade.toUpperCase(),
    naturalidade_uf: uf.toUpperCase().slice(0, 2),
  };
}
