import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTutorialsPanel } from "@/components/admin/admin-tutorials-panel";
import { getStaffSession } from "@/lib/api/staff-session";

export default async function AdminTutoriaisPage() {
  const session = await getStaffSession();
  if (!session) redirect("/login?next=/admin/tutoriais");

  const canEditVideos = session.role === "master";

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
          Conteúdo
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
              Vídeos tutoriais
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {canEditVideos ? (
                <>
                  Somente o <strong>master</strong> cadastra ou edita tutoriais
                  em vídeo (YouTube ou Vimeo). Os administradores podem apenas
                  visualizar. Os alunos veem a lista em{" "}
                  <strong>Tutoriais</strong> no portal.
                </>
              ) : (
                <>
                  Visualização dos vídeos tutoriais (YouTube ou Vimeo). Para
                  cadastrar ou editar, é necessário o utilizador{" "}
                  <strong>master</strong>.
                </>
              )}
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/90"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>

      <AdminTutorialsPanel canEditVideos={canEditVideos} />
    </div>
  );
}
