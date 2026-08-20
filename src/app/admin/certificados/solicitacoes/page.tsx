import Link from "next/link";
import { redirect } from "next/navigation";

import { getStaffSession } from "@/lib/api/staff-session";
import { listPedidosAdmin } from "@/lib/api/curso-pedidos";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";
import {
  matchesTextFilter,
  parseListPageFilters,
} from "@/lib/admin/list-page-filters";

import { SolicitacoesCertificadoClient } from "@/components/admin/solicitacoes-certificado-client";
import { ListPagePagination } from "@/components/admin/list-page-pagination";
import { ListPageSearch } from "@/components/admin/list-page-search";

const PAGE_SIZE = 10;
const BASE_PATH = "/admin/certificados/solicitacoes";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCertificadoSolicitacoesPage({
  searchParams,
}: PageProps) {
  const session = await getStaffSession();
  if (!session) redirect("/login?next=/admin/certificados/solicitacoes");

  const filters = parseListPageFilters(
    searchParams ? await searchParams : {},
  );

  let pedidos: Awaited<ReturnType<typeof listPedidosAdmin>> = [];
  let loadError: string | null = null;
  try {
    pedidos = await listPedidosAdmin();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  // Busca textual (curso, nome, e-mail).
  const filtrados = matchesTextFilter(pedidos, filters.q, [
    (p) => p.curso_nome,
    (p) => p.aluno_nome,
    (p) => p.aluno_email,
  ]);

  // Paginação (10 por página).
  const totalCount = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const slice = filtrados.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // Pré-assinar thumbnails (server-side) só para a página atual.
  const thumbs = await Promise.all(
    slice.map(async (p) => ({
      id: p.id,
      url: await getSignedStorageUrl(p.curso_image_key ?? null),
    })),
  );
  const thumbMap = Object.fromEntries(thumbs.map((t) => [t.id, t.url]));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#D9571E]">
          Solicitações de certificado
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Pedidos de certificado feitos pelos alunos a partir do card &quot;Cursos&quot;.
          Inicie a certificação se tudo estiver OK com a plataforma de curso,
          ou recuse para libertar o botão de solicitar.
        </p>
      </header>

      <div className="mb-4">
        <ListPageSearch
          basePath={BASE_PATH}
          filters={filters}
          placeholder="Pesquisar por curso, nome ou e-mail…"
        />
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Erro a listar pedidos: {loadError}
        </div>
      ) : null}

      {slice.length === 0 && !loadError ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600 shadow-sm">
          {filters.q
            ? "Nenhum resultado para a sua pesquisa."
            : "Sem pedidos registados."}
        </p>
      ) : null}

      <SolicitacoesCertificadoClient
        pedidos={slice}
        thumbMap={thumbMap}
        backHref="/admin"
      />

      <ListPagePagination
        basePath={BASE_PATH}
        filters={filters}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        ariaLabel="Paginação de solicitações de certificado"
      />

      <div className="mt-6">
        <Link
          href="/admin"
          className="inline-flex min-h-[36px] items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}