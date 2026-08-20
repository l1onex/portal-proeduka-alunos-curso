import Link from "next/link";
import type { ReactNode } from "react";
import {
  buildAlunosListHref,
  type AlunosListFilters,
} from "@/lib/admin/alunos-list-filters";

const PAGE_SIZE = 18;

type Props = {
  page: number;
  totalPages: number;
  totalCount: number;
  filters: AlunosListFilters;
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

export function AlunosPagination({ page, totalPages, totalCount, filters }: Props) {
  if (totalCount === 0) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <nav
      className="flex flex-col items-center gap-4 border-t border-slate-200/90 pt-6 sm:flex-row sm:flex-wrap sm:justify-between"
      aria-label="Paginação da lista de alunos"
    >
      <p className="text-center text-xs text-slate-500 sm:text-left">
        {totalCount === 0 ? (
          "Nenhum resultado."
        ) : (
          <>
            Mostrando{" "}
            <span className="font-semibold tabular-nums text-slate-700">
              {start}–{end}
            </span>{" "}
            de{" "}
            <span className="font-semibold tabular-nums text-slate-700">
              {totalCount}
            </span>
          </>
        )}
      </p>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <PaginationLink
            href={buildAlunosListHref(page - 1, filters)}
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
                href={buildAlunosListHref(item, filters)}
                active={item === page}
                label={`Página ${item}`}
              >
                {item}
              </PaginationLink>
            ),
          )}

          <PaginationLink
            href={buildAlunosListHref(page + 1, filters)}
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
  if (disabled) {
    return (
      <span
        className="inline-flex min-h-[36px] min-w-[36px] cursor-not-allowed items-center justify-center rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm text-slate-300"
        aria-hidden
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition ${
        active
          ? "border-[#F66828] bg-[#F66828]/10 text-[#D9571E] shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#F66828]/50 hover:bg-sky-50/80"
      } `}
    >
      {children}
    </Link>
  );
}

export const ALUNOS_PAGE_SIZE = PAGE_SIZE;
