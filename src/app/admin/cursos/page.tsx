import Link from "next/link";

import { getStaffSession } from "@/lib/api/staff-session";
import { listCursos, type CursoRow } from "@/lib/api/cursos";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Página de listagem de cursos (apenas master/admin). */
export default async function AdminCursosPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    redirect("/login?next=/admin/cursos");
  }

  let cursos: CursoRow[] = [];
  let loadError: string | null = null;
  try {
    cursos = await listCursos();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  // Pré-assinar URLs das imagens (server-side; sem passar pelo endpoint HTTP).
  const imageUrls = await Promise.all(
    cursos.map(async (c) => {
      return await getSignedStorageUrl(c.image_key);
    }),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#D9571E]">Cursos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Cadastra os cursos disponíveis para os alunos solicitarem.
          </p>
        </div>
        <Link
          href="/admin/cursos/novo"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
        >
          Novo curso
        </Link>
      </header>

      {loadError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Erro ao listar cursos: {loadError}
        </div>
      ) : null}

      {cursos.length === 0 && !loadError ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            Ainda não há cursos cadastrados.
          </p>
          <Link
            href="/admin/cursos/novo"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#F66828] bg-white px-5 py-2.5 text-sm font-semibold text-[#F66828] transition hover:bg-[#F66828]/5"
          >
            Cadastrar o primeiro curso
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((c, idx) => (
            <li
              key={c.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <Link href={`/admin/cursos/${c.id}`} className="block">
                <div className="relative aspect-video w-full bg-slate-100">
                  {imageUrls[idx] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrls[idx]!}
                      alt={c.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                      Sem imagem
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                    {c.nome}
                  </h3>
                  {c.descricao ? (
                    <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                      {c.descricao}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm italic text-slate-400">
                      Sem descrição.
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}