/**
 * Helpers para listas paginadas com busca textual (`q`) e página (`page`).
 * URL-driven — back/forward do browser e deep-linking funcionam.
 */

export type ListPageFilters = {
  q: string;
  page: number;
};

/** Lê filtros de URL (search params) — defaults seguros. */
export function parseListPageFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ListPageFilters {
  const rawQ = searchParams.q;
  const q = typeof rawQ === "string" ? rawQ.trim() : "";
  const rawPage = searchParams.page;
  const pageNum =
    typeof rawPage === "string" ? parseInt(rawPage, 10) : Number.NaN;
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;
  return { q, page };
}

/** Monta um href preservando `q` e atualizando `page`. */
export function buildListPageHref(
  basePath: string,
  filters: ListPageFilters,
  nextPage: number,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (nextPage > 1) params.set("page", String(nextPage));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Filtra uma lista de itens por texto em alguns campos string. */
export function matchesTextFilter<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  fields: Array<keyof T | ((row: T) => string | null | undefined)>,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    for (const f of fields) {
      const value =
        typeof f === "function" ? f(row) : (row[f] as unknown as string | null | undefined);
      if (typeof value === "string" && value.toLowerCase().includes(q)) {
        return true;
      }
    }
    return false;
  });
}