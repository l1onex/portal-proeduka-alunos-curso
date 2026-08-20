/**
 * Equivalente Postgres dos filtros (`applyAlunosFiltersToQuery`) da lista `/admin/alunos`.
 */

import {
  DOC_KEYS_ORDERED,
  INFO_KEYS_OPCIONAIS,
  INFO_KEYS_ORDERED,
} from "@/lib/aluno-tabela";

import {
  EMPTY_FORM_PAG,
  type AlunosListFilters,
} from "@/lib/admin/alunos-list-filters";
import { quotePgColumnIdentifier as qc } from "@/lib/db/quote-pg-col";

function textoEmFaltaSql(col: string): string {
  const c = qc(col);
  return `(${c} IS NULL OR trim(${c}::text) = '')`;
}

function docBoolNaoConfirmado(col: string): string {
  const c = qc(col);
  return `(COALESCE((${c})::boolean, FALSE) <> TRUE)`;
}

function docBoolConfirmado(col: string): string {
  const c = qc(col);
  return `(COALESCE((${c})::boolean, FALSE) = TRUE)`;
}

/** OR alinhado a “cadastro incompleto” (`em_andamento`). */
function pendenteCadastroOrSql(): string {
  const clauses: string[] = [];
  for (const key of INFO_KEYS_ORDERED) {
    if (INFO_KEYS_OPCIONAIS.has(key)) continue;
    clauses.push(textoEmFaltaSql(key));
  }
  for (const key of DOC_KEYS_ORDERED) {
    clauses.push(docBoolNaoConfirmado(key));
  }
  return `(${clauses.join(" OR ")})`;
}

function cadastroCompletoAndSql(): string {
  const ands: string[] = [];
  ands.push(`(final IS NULL OR final = false)`);
  ands.push(`(desistente IS NULL OR desistente = false)`);
  ands.push(`(inadimplente IS NULL OR inadimplente = false)`);
  for (const key of INFO_KEYS_ORDERED) {
    if (INFO_KEYS_OPCIONAIS.has(key)) continue;
    const c = qc(key);
    ands.push(`(${c} IS NOT NULL AND trim(${c}::text) <> '')`);
  }
  for (const key of DOC_KEYS_ORDERED) {
    ands.push(docBoolConfirmado(key));
  }
  return ands.join(" AND ");
}

export type SqlWhere = {
  clause: string;
  params: (string | boolean | number | null)[];
};

export function buildAlunosListWhere(filters: AlunosListFilters): SqlWhere {
  const parts: string[] = [];
  const params: (string | boolean | number | null)[] = [];
  let $ = 0;
  const p = () => {
    $ += 1;
    return `$${$}`;
  };

  const f = filters;

  parts.push("(TRUE)");

  if (f.unidade) {
    params.push(f.unidade);
    parts.push(`unidade::text = ${p()}`);
  }
  if (f.curso) {
    params.push(f.curso);
    parts.push(`curso::text = ${p()}`);
  }

  if (f.form_pag === EMPTY_FORM_PAG) {
    parts.push(`(form_pag IS NULL OR trim(form_pag::text) = '')`);
  } else if (f.form_pag) {
    params.push(f.form_pag);
    parts.push(`form_pag::text = ${p()}`);
  }

  if (f.status === "desistente") {
    parts.push("(desistente = TRUE)");
  } else if (f.status === "aprovado") {
    parts.push("(final = TRUE)");
  } else if (f.status === "em_andamento") {
    parts.push("(desistente IS NULL OR desistente = false)");
    parts.push("(final IS NULL OR final = false)");
    parts.push(pendenteCadastroOrSql());
  } else if (f.status === "em_analise") {
    parts.push(`(${cadastroCompletoAndSql()})`);
    parts.push("(certificado_solicitado_em IS NOT NULL)");
  } else if (f.status === "aguardando_solicitacao") {
    parts.push(`(${cadastroCompletoAndSql()})`);
    parts.push("(certificado_solicitado_em IS NULL)");
  } else if (f.status === "inadimplente") {
    parts.push("(inadimplente = TRUE)");
  }

  if (f.validacao === "suspensa") {
    parts.push("(validacao_suspensa = TRUE)");
  } else if (f.validacao === "ativa") {
    parts.push(
      "(validacao_suspensa IS NULL OR validacao_suspensa = false)",
    );
  }

  if (f.q) {
    params.push(`%${f.q}%`);
    const n = p();
    parts.push(`(
      nome::text ILIKE ${n}
      OR email::text ILIKE ${n}
      OR curso::text ILIKE ${n}
      OR unidade::text ILIKE ${n}
    )`);
  }

  return {
    clause: `WHERE ${parts.join(" AND ")}`,
    params,
  };
}
