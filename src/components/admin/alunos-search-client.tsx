"use client";

import Link from "next/link";
import { AlunosPagination } from "@/components/admin/alunos-pagination";
import {
  StudentsGrid,
  type StudentCardData,
} from "@/components/admin/students-grid";
import {
  EMPTY_FORM_PAG,
  hasAnyAlunosFilter,
  type AlunosFilterOptions,
  type AlunosListFilters,
} from "@/lib/admin/alunos-list-filters";

type Props = {
  rows: StudentCardData[];
  page: number;
  totalPages: number;
  totalCount: number;
  filters: AlunosListFilters;
  filterOptions: AlunosFilterOptions;
  hasEmptyFormPag: boolean;
};

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

export function AlunosSearchClient({
  rows,
  page,
  totalPages,
  totalCount,
  filters,
  filterOptions,
  hasEmptyFormPag,
}: Props) {
  const hasActive =
    !!filters.q.trim() || hasAnyAlunosFilter(filters);

  return (
    <div className="space-y-6">
      <form
        action="/admin/alunos"
        method="get"
        className="space-y-6"
        key={JSON.stringify(filters)}
      >
        <input type="hidden" name="page" value="1" />

        <div className="relative">
          <label htmlFor="alunos-busca" className="sr-only">
            Buscar aluno
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            id="alunos-busca"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Buscar por nome, e-mail, curso ou unidade…"
            className="w-full rounded-2xl border border-slate-200/90 bg-white/95 py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20"
          />
        </div>

        <fieldset className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm sm:p-5">
          <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            Filtros
          </legend>
          <p className="mb-4 text-xs leading-relaxed text-slate-500">
            Combine com a busca acima. Campos vazios não restringem o resultado.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Unidade
              <select name="unidade" defaultValue={filters.unidade} className={selectClass}>
                <option value="">Todas</option>
                {filterOptions.unidades.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Curso
              <select name="curso" defaultValue={filters.curso} className={selectClass}>
                <option value="">Todos</option>
                {filterOptions.cursos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Forma de pagamento
              <select
                name="form_pag"
                defaultValue={filters.form_pag}
                className={selectClass}
              >
                <option value="">Todas</option>
                {hasEmptyFormPag ? (
                  <option value={EMPTY_FORM_PAG}>Não informado</option>
                ) : null}
                {filterOptions.formPags.map((fp) => (
                  <option key={fp} value={fp}>
                    {fp}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Status
              <select
                name="status"
                defaultValue={filters.status}
                title="Desistente, em andamento (pendências), aguarda solicitação (cadastro completo sem pedido no portal), em análise (pedido feito), aprovado, inadimplente."
                className={selectClass}
              >
                <option value="">Todos</option>
                <option value="em_andamento">Em andamento</option>
                <option value="aguardando_solicitacao">Aguarda solicitação</option>
                <option value="em_analise">Em análise</option>
                <option value="desistente">Desistente</option>
                <option value="aprovado">Aprovado (certificado)</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Validação pública
              <select
                name="validacao"
                defaultValue={filters.validacao}
                className={selectClass}
              >
                <option value="">Todas</option>
                <option value="suspensa">Suspensa</option>
                <option value="ativa">Ativa (não suspensa)</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
            >
              Aplicar filtros
            </button>
            {hasActive ? (
              <Link
                href="/admin/alunos"
                className="text-sm font-semibold text-slate-600 underline-offset-2 hover:text-[#D9571E] hover:underline"
              >
                Limpar busca e filtros
              </Link>
            ) : null}
          </div>
        </fieldset>

        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">
            {totalCount} registo{totalCount === 1 ? "" : "s"}
          </span>
          {hasActive ? (
            <span className="text-slate-500"> com os critérios actuais.</span>
          ) : null}
        </p>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/90 py-12 text-center text-sm text-slate-600">
          Nenhum aluno encontrado com estes critérios.
        </p>
      ) : (
        <StudentsGrid rows={rows} />
      )}

      <AlunosPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        filters={filters}
      />
    </div>
  );
}
