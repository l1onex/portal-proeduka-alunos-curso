/**
 * Verifica se `dt_nasc` (valor da tabela, ex. dd/mm/aaaa) coincide com o dia/mês
 * de hoje no fuso America/Sao_Paulo.
 */
export function isBirthdayTodayInBrazil(dtNasc: unknown): boolean {
  const parts = parseBirthDateParts(dtNasc);
  if (!parts) return false;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    month: "numeric",
    day: "numeric",
  });
  const now = new Date();
  const partsNow = formatter.formatToParts(now);
  const month = Number(partsNow.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(partsNow.find((p) => p.type === "day")?.value ?? 0);

  return parts.month === month && parts.day === day;
}

export function todayDateStringBrazil(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function parseBirthDateParts(
  v: unknown,
): { day: number; month: number; year: number } | null {
  if (v == null) return null;
  const s = String(v).trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    const year = Number(br[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
      return { day, month, year };
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    if (y && m && d) return { day: d, month: m, year: y };
  }
  return null;
}
