/**
 * Filtros da lista /admin/alunos (query string + aplicação nas queries Supabase).
 */

import {
  DOC_KEYS_ORDERED,
  INFO_KEYS_OPCIONAIS,
  INFO_KEYS_ORDERED,
} from "@/lib/aluno-tabela";

export type AlunosListFilters = {
  q: string;
  unidade: string;
  curso: string;
  /** Valor mágico `__none__` = form_pag vazio ou null na base */
  form_pag: string;
  /**
   * Situação: desistente | certificado (final) | cadastro com pendências (em_andamento) |
   * em análise (cadastro completo, sem final) | inadimplente (coluna inadimplente).
   */
  status:
    | ""
    | "desistente"
    | "aprovado"
    | "em_andamento"
    | "em_analise"
    | "aguardando_solicitacao"
    | "inadimplente";
  validacao: "" | "suspensa" | "ativa";
};

export const EMPTY_FORM_PAG = "__none__" as const;

let pendenteCadastroOrCache: string | null = null;

function quoteCol(key: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return key;
  return `"${key.replace(/"/g, '""')}"`;
}

/**
 * Condição OR alinhada a `computePendencias`: pelo menos um campo de informação
 * vazio (exceto opcionais) ou documento não enviado.
 */
export function getPendenteCadastroOrFilter(): string {
  if (pendenteCadastroOrCache) return pendenteCadastroOrCache;
  const parts: string[] = [];
  for (const key of INFO_KEYS_ORDERED) {
    if (INFO_KEYS_OPCIONAIS.has(key)) continue;
    const c = quoteCol(key);
    parts.push(`${c}.is.null`, `${c}.eq.`);
  }
  for (const key of DOC_KEYS_ORDERED) {
    const c = quoteCol(key);
    parts.push(`${c}.is.null`, `${c}.eq.`, `${c}.eq.false`);
  }
  pendenteCadastroOrCache = parts.join(",");
  return pendenteCadastroOrCache;
}

/** Cadastro completo (inverso da OR de pendente) + sem final, desistente ou inadimplente. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyEmAnaliseCadastroCompleto(query: any): any {
  let q = query;
  q = q.or("final.is.null,final.eq.false");
  q = q.or("desistente.is.null,desistente.eq.false");
  q = q.or("inadimplente.is.null,inadimplente.eq.false");
  for (const key of INFO_KEYS_ORDERED) {
    if (INFO_KEYS_OPCIONAIS.has(key)) continue;
    const c = quoteCol(key);
    q = q.not(c, "is", null);
    q = q.neq(c, "");
  }
  for (const key of DOC_KEYS_ORDERED) {
    const c = quoteCol(key);
    q = q.not(c, "is", null);
    q = q.neq(c, "");
    q = q.neq(c, false);
  }
  return q;
}

export const defaultAlunosListFilters = (): AlunosListFilters => ({
  q: "",
  unidade: "",
  curso: "",
  form_pag: "",
  status: "",
  validacao: "",
});

export function parseAlunosListFilters(
  sp: Record<string, string | string[] | undefined>,
): AlunosListFilters {
  const s = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : "";
  };
  const val = s("validacao");

  let status = s("status");
  if (status === "pendente") status = "em_andamento";
  if (!status && s("desistente") === "sim") status = "desistente";
  if (!status && s("certificado") === "sim") status = "aprovado";

  const statusNorm =
    status === "desistente" ||
    status === "aprovado" ||
    status === "em_andamento" ||
    status === "em_analise" ||
    status === "aguardando_solicitacao" ||
    status === "inadimplente"
      ? status
      : "";

  return {
    q: s("q").replace(/[%_]/g, " ").trim(),
    unidade: s("unidade"),
    curso: s("curso"),
    form_pag: s("form_pag"),
    status: statusNorm,
    validacao:
      val === "suspensa" || val === "ativa" ? val : "",
  };
}

export function hasAnyAlunosFilter(f: AlunosListFilters): boolean {
  return (
    !!f.unidade ||
    !!f.curso ||
    !!f.form_pag ||
    !!f.status ||
    !!f.validacao
  );
}

/** Aplica filtros de coluna + texto (q) num builder PostgREST (Supabase). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cadeia genérica do cliente Supabase
export function applyAlunosFiltersToQuery(query: any, f: AlunosListFilters): any {
  let q = query;

  if (f.unidade) q = q.eq("unidade", f.unidade);
  if (f.curso) q = q.eq("curso", f.curso);

  if (f.form_pag === EMPTY_FORM_PAG) {
    q = q.or("form_pag.is.null,form_pag.eq.");
  } else if (f.form_pag) {
    q = q.eq("form_pag", f.form_pag);
  }

  if (f.status === "desistente") {
    q = q.eq("desistente", true);
  } else if (f.status === "aprovado") {
    q = q.eq("final", true);
  } else if (f.status === "em_andamento") {
    q = q.or("desistente.is.null,desistente.eq.false");
    q = q.or("final.is.null,final.eq.false");
    q = q.or(getPendenteCadastroOrFilter());
  } else if (f.status === "em_analise") {
    q = applyEmAnaliseCadastroCompleto(q);
    q = q.not("certificado_solicitado_em", "is", null);
  } else if (f.status === "aguardando_solicitacao") {
    q = applyEmAnaliseCadastroCompleto(q);
    q = q.is("certificado_solicitado_em", null);
  } else if (f.status === "inadimplente") {
    q = q.eq("inadimplente", true);
  }

  if (f.validacao === "suspensa") {
    q = q.eq("validacao_suspensa", true);
  } else if (f.validacao === "ativa") {
    q = q.or("validacao_suspensa.is.null,validacao_suspensa.eq.false");
  }

  if (f.q) {
    const pattern = `%${f.q}%`;
    q = q.or(
      `nome.ilike.${pattern},email.ilike.${pattern},curso.ilike.${pattern},unidade.ilike.${pattern}`,
    );
  }

  return q;
}

export function buildAlunosListHref(
  pageNum: number,
  f: AlunosListFilters,
): string {
  const params = new URLSearchParams();
  if (pageNum > 1) params.set("page", String(pageNum));
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.unidade) params.set("unidade", f.unidade);
  if (f.curso) params.set("curso", f.curso);
  if (f.form_pag) params.set("form_pag", f.form_pag);
  if (f.status) params.set("status", f.status);
  if (f.validacao) params.set("validacao", f.validacao);
  const s = params.toString();
  return s ? `/admin/alunos?${s}` : "/admin/alunos";
}

export type AlunosFilterOptions = {
  unidades: string[];
  cursos: string[];
  formPags: string[];
};

export function collectDistinctOptions(
  rows: Record<string, unknown>[],
): AlunosFilterOptions {
  const add = (set: Set<string>, key: string) => {
    for (const r of rows) {
      const v = r[key];
      if (v == null) continue;
      const t = String(v).trim();
      if (t) set.add(t);
    }
  };
  const u = new Set<string>();
  const c = new Set<string>();
  const fp = new Set<string>();
  add(u, "unidade");
  add(c, "curso");
  add(fp, "form_pag");
  const sort = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return {
    unidades: [...u].sort(sort),
    cursos: [...c].sort(sort),
    formPags: [...fp].sort(sort),
  };
}
