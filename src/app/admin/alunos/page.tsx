import Link from "next/link";
import { ALUNOS_PAGE_SIZE } from "@/components/admin/alunos-pagination";
import { AlunosSearchClient } from "@/components/admin/alunos-search-client";
import { buildAlunosListWhere } from "@/lib/admin/alunos-list-filters-sql";
import { buildStudentCardRows } from "@/lib/admin/aluno-list-cards";
import {
  collectDistinctOptions,
  hasAnyAlunosFilter,
  parseAlunosListFilters,
} from "@/lib/admin/alunos-list-filters";
import { fetchAlunosListFilterMeta } from "@/lib/admin/fetch-alunos-filter-metadata";
import { getAlunosTableName } from "@/lib/aluno-tabela";
import { alunosFqn } from "@/lib/db/alunos-table";
import { getSql } from "@/lib/db/client";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAlunosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = parseAlunosListFilters(sp);
  const requestedPage = Math.max(
    1,
    parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1,
  );

  void getAlunosTableName();

  const sql = getSql();
  const fq = alunosFqn();
  const { clause, params: whereParams } = buildAlunosListWhere(filters);

  let totalCount = 0;
  let errorMsg: string | undefined;
  let filterOptions = collectDistinctOptions([]);
  let hasEmptyFormPag = false;

  try {
    const [cr, meta] = await Promise.all([
      sql.unsafe<Array<{ count: string }>>(
        `SELECT count(*)::text AS count FROM ${fq} ${clause}`,
        whereParams,
      ),
      fetchAlunosListFilterMeta(sql, fq),
    ]);
    filterOptions = meta.filterOptions;
    hasEmptyFormPag = meta.hasEmptyFormPag;
    const n = Number(cr[0]?.count ?? "0");
    totalCount = Number.isFinite(n) ? n : 0;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / ALUNOS_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * ALUNOS_PAGE_SIZE;

  let rows: Record<string, unknown>[] = [];
  if (!errorMsg) {
    const limitIx = whereParams.length + 1;
    const offsetIx = whereParams.length + 2;
    try {
      rows = await sql.unsafe<Record<string, unknown>[]>(
        `
        SELECT *
        FROM ${fq}
        ${clause}
        ORDER BY nome ASC NULLS LAST
        LIMIT $${limitIx} OFFSET $${offsetIx}
      `.trim(),
        [...whereParams, ALUNOS_PAGE_SIZE, offset],
      );
    } catch (e) {
      rows = [];
      errorMsg =
        errorMsg ??
        (e instanceof Error ? e.message : String(e));
    }
  }

  type Row = Record<string, unknown> & {
    id: string;
    nome?: string | null;
    email?: string | null;
    curso?: string | null;
    unidade?: string | null;
  };

  const list = rows as Row[];
  const cardRows =
    list.length > 0 ? await buildStudentCardRows(list) : [];

  const loadError = errorMsg;

  const showEmptyOnboarding =
    !loadError &&
    totalCount === 0 &&
    !filters.q &&
    !hasAnyAlunosFilter(filters);

  return (
    <div className="relative mx-auto max-w-6xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-56 w-56 rounded-full bg-[#F66828]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-[#D9571E]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-slate-50/90 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Base de alunos
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
              Alunos
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Lista com busca, filtros, acesso à ficha dos alunos.
            </p>
          </div>
          <div className="flex w-full flex-shrink-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <Link
              href="/admin/alunos/novo"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:flex-initial"
            >
              Cadastrar aluno
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/90 sm:flex-initial"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Não foi possível carregar a lista.</p>
          <p className="mt-2 font-mono text-xs opacity-90">{loadError}</p>
        </div>
      ) : showEmptyOnboarding ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-inner">
          <p className="text-slate-600">Ainda não há alunos registados.</p>
          <Link
            href="/admin/alunos/novo"
            className="mt-4 inline-flex text-sm font-semibold text-[#F66828] hover:underline"
          >
            Cadastrar o primeiro aluno
          </Link>
        </div>
      ) : (
        <AlunosSearchClient
          rows={cardRows}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          filters={filters}
          filterOptions={filterOptions}
          hasEmptyFormPag={hasEmptyFormPag}
        />
      )}
    </div>
  );
}
