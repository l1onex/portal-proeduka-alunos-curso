/** Formatação para exibição (Brasil). */

import { rowDateToIsoInput } from "@/lib/br-date-input";

/**
 * Fuso usado em todo o produto para data/hora mostrada ao utilizador (independente
 * do fuso da máquina ou do servidor).
 */
export const BRASILIA_TIMEZONE = "America/Sao_Paulo" as const;

/**
 * Anos completos com base em `dt_nasc` da tabela (dd/mm/aaaa ou ISO).
 * Comparado ao dia civil atual em Brasília (`reference`).
 */
export function computeCompletedAgeYearsFromDtNasc(
  dtNasc: unknown,
  reference: Date = new Date(),
): number | null {
  const iso = rowDateToIsoInput(dtNasc).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

  const by = Number(iso.slice(0, 4));
  const bm = Number(iso.slice(5, 7));
  const bd = Number(iso.slice(8, 10));
  if (
    !Number.isFinite(by) ||
    !Number.isFinite(bm) ||
    !Number.isFinite(bd) ||
    bm < 1 ||
    bm > 12 ||
    bd < 1 ||
    bd > 31
  ) {
    return null;
  }

  const todayIso = reference.toLocaleDateString("en-CA", {
    timeZone: BRASILIA_TIMEZONE,
  });
  const [tyStr, tmStr, tdStr] = todayIso.split("-");
  const ty = Number(tyStr);
  const tm = Number(tmStr);
  const td = Number(tdStr);
  if (
    !Number.isFinite(ty) ||
    !Number.isFinite(tm) ||
    !Number.isFinite(td)
  ) {
    return null;
  }

  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

export function formatPhoneBR(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return value.trim();
}

export function formatCPF(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length !== 11) return value.trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * CPF no validador público: só início e fim (ex.: 12*******03).
 * Com 11 dígitos: 2 + sete asteriscos + 2.
 */
export function maskCpfValidatorDisplay(value: unknown): string | null {
  if (value == null || value === "") return null;
  const d = String(value).replace(/\D/g, "");
  if (d.length < 4) return null;
  if (d.length === 11) {
    return `${d.slice(0, 2)}*******${d.slice(-2)}`;
  }
  const first = d.slice(0, 2);
  const last = d.slice(-2);
  const midLen = Math.max(3, d.length - 4);
  return `${first}${"*".repeat(Math.min(7, midLen))}${last}`;
}

/**
 * Data em dd/mm/aaaa no fuso de Brasília.
 * Strings só com `YYYY-MM-DD` (sem hora) são tratadas como data civil, sem deslocar o dia.
 */
export function formatDateBR(value: unknown): string {
  if (value == null || value === "") return "—";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: BRASILIA_TIMEZONE,
    }).format(value);
  }
  const s = String(value).trim();
  if (!s) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: BRASILIA_TIMEZONE,
    }).format(dt);
  }
  return s;
}

/**
 * Data e hora em pt-BR no fuso de Brasília (certificados, auditoria, chaves API, etc.).
 */
export function formatDateTimeBrazil(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = value instanceof Date ? value.toISOString() : String(value).trim();
  const d = Date.parse(s);
  if (!Number.isFinite(d)) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BRASILIA_TIMEZONE,
  }).format(new Date(d));
}

/**
 * Coluna `data` da tabela de alunos (data de matrícula/registo), ex. dd/mm/aaaa ou com hora.
 */
export function formatDataMatriculaColuna(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dd = m[1]!.padStart(2, "0");
    const mm = m[2]!.padStart(2, "0");
    const yyyy = m[3]!;
    return `${dd}/${mm}/${yyyy}`;
  }
  return formatDateBR(value);
}

/** Preferência: `data` (matrícula); senão `created_at`. */
export function formatAlunoDataMatriculaDisplay(row: Record<string, unknown>): string {
  const d = row.data;
  if (d != null && String(d).trim() !== "") {
    return formatDataMatriculaColuna(d);
  }
  return formatDateBR(row.created_at);
}

/** `homologado_em` (ISO ou Date) para exibição no painel admin. */
export function formatHomologadoEmDisplay(value: unknown): string {
  if (value == null || value === "") return "";
  const t = formatDateTimeBrazil(value);
  if (t !== "—") return t;
  return formatDateBR(value);
}

/**
 * Livro do registo escolar na UI: sempre 2 algarismos com zero à esquerda (ex.: 2 → "02").
 * Valores ≥ 10 mantêm dois dígitos naturais (ex.: 10 → "10").
 */
export function formatRegistroLivroDisplay(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 1) return "";
  return String(Math.trunc(n)).padStart(2, "0");
}

/**
 * Página do registo escolar na UI: preencher com zeros à esquerda até 3 algarismos
 * para páginas 1–99 (ex.: 7 → "007", 27 → "027"). A partir de 100 o texto já tem
 * três ou mais dígitos (ex.: 100, 110) — sem zero supérfluo.
 */
export function formatRegistroPaginaDisplay(
  n: number | null | undefined,
): string {
  if (n == null || !Number.isFinite(n) || n < 1) return "";
  return String(Math.trunc(n)).padStart(3, "0");
}

export { buildPublicValidatorUrl as buildValidationPublicUrl } from "@/lib/certificate/public-url";
