/** Converte valor da tabela (ex.: dd/mm/aaaa) para input type=date (yyyy-mm-dd). */

export function rowDateToIsoInput(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3];
    return `${y}-${mo}-${d}`;
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return "";
}

/** Guardar na tabela no formato brasileiro usado no projeto. */
export function isoInputToBrDate(iso: string): string {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(t)) return t;
  const [y, m, d] = t.slice(0, 10).split("-");
  if (!y || !m || !d) return t;
  return `${d}/${m}/${y}`;
}

/** Máscara enquanto digita: dd/mm/aaaa (só dígitos). */
export function formatBrDateMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Valor vindo da linha (ISO ou dd/mm) para exibir no campo com máscara dd/mm/aaaa.
 * Evita interpretar yyyy-mm-dd como 8 dígitos soltos (que quebrariam a máscara).
 */
export function rowDateToBrMaskDisplay(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return formatBrDateMask(isoInputToBrDate(s.slice(0, 10)));
  }
  return formatBrDateMask(s);
}

/**
 * Valor para gravar na BD (dd/mm/aaaa) ou null.
 * Aceita yyyy-mm-dd, dd/mm/aaaa (com ou sem zeros à esquerda) ou 8 dígitos seguidos.
 */
export function brDateStringToDb(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return isoInputToBrDate(t);
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  }
  return null;
}
