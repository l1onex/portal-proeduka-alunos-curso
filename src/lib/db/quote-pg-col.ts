/**
 * Identificador de coluna em SQL Postgres (schema `public`).
 * Aspas duplas quando o nome tem espaços/símbolos ou casing misto sem `_`
 * (ex.: `Reservista` → `"Reservista"`; sem aspas vira `reservista` e falha se a coluna for case-sensitive).
 */
export function quotePgColumnIdentifier(key: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return `"${key.replace(/"/g, '""')}"`;
  }
  if (
    !key.includes("_") &&
    /[A-Z]/.test(key) &&
    /[a-z]/.test(key)
  ) {
    return `"${key.replace(/"/g, '""')}"`;
  }
  return key;
}
