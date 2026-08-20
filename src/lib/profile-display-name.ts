/** Nome exibido: schema do repo usa `full_name`; bases antigas podem usar só `nome`. */
export function profileDisplayName(
  row: Record<string, unknown> | null | undefined,
): string | null {
  if (!row) return null;
  const v = row.full_name ?? row.nome;
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}
