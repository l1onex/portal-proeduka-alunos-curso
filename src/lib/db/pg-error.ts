/** Código Postgres: função/recurso indefinido (migração ainda não aplicada). */
export function isPgUndefinedFunction(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const c = e as { code?: string };
  return c.code === "42883";
}

/** Tabela ou outro objeto de relação inexistente (ex.: sequência não criada). */
export function isPgUndefinedRelation(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const c = e as { code?: string };
  return c.code === "42P01";
}
