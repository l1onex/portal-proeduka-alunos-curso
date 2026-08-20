import Link from "next/link";
import type { ReactNode } from "react";

import {
  buildListPageHref,
  type ListPageFilters,
} from "@/lib/admin/list-page-filters";

const DEFAULT_PAGE_SIZE = 10;

type Props = {
  basePath: string;
  filters: ListPageFilters;
  page: number;
  totalPages: number;
  totalCount: number;
  /** Página em que cada link começa/termina (default 10). */
  pageSize?: number;
  /** Rótulo mostrado nos botões de "anterior" e "seguinte" (a11y). */
  ariaLabel?: string;
};

/** Lista compacta de números de página (reticências quando há muitas páginas). */
function visiblePageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 11) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) result.push("ellipsis");
    result.push(sorted[i]!);
  }
  return result;
}

export function ListPagePagination({
  basePath,
  filters,
  page,
  totalPages,
  totalCount,
  pageSize = DEFAULT_PAGE_SIZE,
  ariaLabel = "Paginação",
}: Props) {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <nav
      className="mt-4 flex flex-col items-center gap-3 border-t border-slate-200/90 pt-4 sm:flex-row sm:flex-wrap sm:justify-between"
      aria-label={ariaLabel}
    >
      <p className="text-center text-xs text-slate-500 sm:text-left">
        Mostrando{" "}
        <span className="font-semibold tabular-nums text-slate-700">
          {start}–{end}
        </span>{" "}
        de{" "}
        <span className="font-semibold tabular-nums text-slate-700">
          {totalCount}
        </span>
      </p>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <PaginationLink
            href={buildListPageHref(basePath, filters, page - 1)}
            disabled={page <= 1}
            label="Página anterior"
          >
            ‹
          </PaginationLink>

          {visiblePageNumbers(page, totalPages).map((item, i) =>
            item === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="px-1.5 py-1 text-sm text-slate-400"
                aria-hidden
              >
                …
              </span>
            ) : (
              <PaginationLink
                key={item}
                href={buildListPageHref(basePath, filters, item)}
                active={item === page}
                label={`Página ${item}`}
              >
                {item}
              </PaginationLink>
            ),
          )}

          <PaginationLink
            href={buildListPageHref(basePath, filters, page + 1)}
            disabled={page >= totalPages}
            label="Página seguinte"
          >
            ›
          </PaginationLink>
        </div>
      ) : null}
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  active,
  label,
  children,
}: {
  href: string;
  disabled?: boolean;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  const base =
    "inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full px-3 py-1 text-sm font-semibold transition";
  if (disabled) {
    return (
      <span
        aria-disabled
        aria-label={label}
        className={`${base} cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-300`}
      >
        {children}
      </span>
    );
  }
  if (active) {
    return (
      <span
        aria-current="page"
        aria-label={label}
        className={`${base} bg-[#D9571E] text-white shadow`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${base} border border-slate-200 bg-white text-slate-700 hover:border-[#F66828]/50 hover:bg-sky-50/70 hover:text-[#D9571E]`}
    >
      {children}
    </Link>
  );
}