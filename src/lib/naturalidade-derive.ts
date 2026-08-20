/** Texto legado para a coluna `naturalidade`: "CIDADE / UF". */
export function deriveNaturalidadeText(
  uf: string | null | undefined,
  cidade: string | null | undefined,
): string | null {
  const u = (typeof uf === "string" ? uf : "").trim().toUpperCase();
  const c = (typeof cidade === "string" ? cidade : "").trim().toUpperCase();
  if (u.length === 2 && /^[A-Z]{2}$/.test(u) && c.length > 0) return `${c} / ${u}`;
  return null;
}
