import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/api/staff-session";
import { formatDateTimeBrazil } from "@/lib/format-br";
import { loadCertificadosAprovados } from "@/lib/admin/load-certificados-aprovados";
import {
  matchesTextFilter,
  parseListPageFilters,
} from "@/lib/admin/list-page-filters";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";
import { ListPagePagination } from "@/components/admin/list-page-pagination";
import { ListPageSearch } from "@/components/admin/list-page-search";

const PAGE_SIZE = 10;
const BASE_PATH = "/admin/certificados";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCertificadosPage({
  searchParams,
}: PageProps) {
  const session = await getStaffSession();
  if (!session) redirect("/login?next=/admin/certificados");
  if (session.role !== "master") {
    return (
      <div className="relative mx-auto max-w-lg px-4">
        <div
          className="pointer-events-none absolute -left-4 -top-4 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-6 py-10 text-center shadow-lg shadow-amber-100/50">
          <p className="font-semibold text-amber-950">Acesso restrito ao master</p>
          <p className="mt-2 text-sm text-amber-900/90">
            Apenas o utilizador master pode ver o histórico de certificações.
          </p>
          <Link
            href="/admin"
            className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/80"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filters = parseListPageFilters(
    searchParams ? await searchParams : {},
  );

  const { rows, error } = await loadCertificadosAprovados();

  // Busca textual (curso, nome, e-mail).
  const filtrados = matchesTextFilter(rows, filters.q, [
    (r) => r.cursoNome,
    (r) => r.nomeAluno,
    (r) => r.emailAluno,
  ]);

  // Paginação (10 por página).
  const totalCount = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const slice = filtrados.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // Pré-assina thumbnails (server-side).
  const thumbs = await Promise.all(
    slice.map(async (r) => ({
      id: r.id,
      url: await getSignedStorageUrl(r.cursoImageKey ?? null),
    })),
  );
  const thumbMap = Object.fromEntries(thumbs.map((t) => [t.id, t.url]));

  return (
    <div className="relative mx-auto max-w-6xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-56 w-56 rounded-full bg-[#F66828]/12 blur-3xl"
        aria-hidden
      />
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-slate-50/90 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Auditoria
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
              Certificados aprovados
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Lista de alunos cuja certificação foi iniciada por um administrador:
              nome, data e hora, e quem aprovou. Visível apenas para o master.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/admin/certificados/solicitacoes"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/80"
            >
              Solicitações de certificado
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <ListPageSearch
          basePath={BASE_PATH}
          filters={filters}
          placeholder="Pesquisar por curso, nome ou e-mail…"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          {error}
        </p>
      ) : slice.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600 shadow-sm">
          {filters.q
            ? "Nenhum resultado para a sua pesquisa."
            : "Ainda não há aprovações registadas. Quando um administrador clicar em “Iniciar certificação”, o registo aparecerá aqui."}
        </p>
      ) : (
        <ul className="space-y-3">
          {slice.map((r) => {
            const thumb = thumbMap[r.id];
            const nome = r.nomeAluno?.trim() || r.emailAluno || "—";
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-36">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={r.cursoNome ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Concluído
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {r.cursoNome ?? "—"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-semibold">Aluno:</span>{" "}
                      <Link
                        href={`/admin/alunos/${r.alunoId}`}
                        className="text-[#F66828] underline-offset-2 hover:underline"
                      >
                        {nome}
                      </Link>
                    </p>
                    {r.emailAluno && r.nomeAluno ? (
                      <p className="text-xs text-slate-500">{r.emailAluno}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      Aprovado em {formatDateTimeBrazil(r.aprovadoEmIso)}
                    </p>
                    {r.aprovadoPorNome ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Aprovado por{" "}
                        <span className="font-medium text-slate-700">
                          {r.aprovadoPorNome}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ListPagePagination
        basePath={BASE_PATH}
        filters={filters}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        ariaLabel="Paginação de certificados aprovados"
      />
    </div>
  );
}