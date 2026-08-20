import Link from "next/link";

import type { ListPageFilters } from "@/lib/admin/list-page-filters";

type Props = {
  basePath: string;
  filters: ListPageFilters;
  placeholder?: string;
  /** Rótulo do input (a11y). */
  label?: string;
};

/**
 * Campo de busca textual para listas paginadas.
 *
 * É um `<form method="GET">` — submete para a mesma URL com `?q=...`.
 * Preserva outros parâmetros naturalmente (só `q` e `page`).
 * Botão "Limpar" remove o filtro (mantém `page` para reset não ficar esquisito).
 */
export function ListPageSearch({
  basePath,
  filters,
  placeholder = "Pesquisar por curso, nome ou e-mail…",
  label = "Pesquisar",
}: Props) {
  const action = filters.q ? `${basePath}?q=${encodeURIComponent(filters.q)}` : basePath;

  return (
    <form
      method="GET"
      action={action}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      role="search"
    >
      <label className="sr-only" htmlFor="list-page-search-input">
        {label}
      </label>
      <div className="relative flex-1">
        <input
          id="list-page-search-input"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder={placeholder}
          autoComplete="off"
          className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/25"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <button
        type="submit"
        className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
      >
        Pesquisar
      </button>
      {filters.q ? (
        <Link
          href={basePath}
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Limpar
        </Link>
      ) : null}
    </form>
  );
}