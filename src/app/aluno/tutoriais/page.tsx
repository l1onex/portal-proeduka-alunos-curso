import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/api/student-session";
import { getSql } from "@/lib/db/client";

export default async function AlunoTutoriaisPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login?next=/aluno/tutoriais");

  const sql = getSql();

  let rows: Array<{
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
  }> = [];
  try {
    rows = await sql`
      SELECT id::text AS id,
             title::text AS title,
             description::text AS description,
             thumbnail_url::text AS thumbnail_url
      FROM public.tutorial_videos
      ORDER BY sort_order ASC NULLS LAST, created_at DESC
    `;
  } catch {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Não foi possível carregar os tutoriais. Tente novamente mais tarde.
      </div>
    );
  }

  const list = rows ?? [];

  return (
    <div className="relative mx-auto max-w-4xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-48 w-48 rounded-full bg-[#F66828]/10 blur-3xl"
        aria-hidden
      />

      <header className="relative mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Aprenda no seu ritmo
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#D9571E] sm:text-3xl">
          Tutoriais em vídeo
        </h1>
      </header>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-6 py-10 text-center text-sm text-slate-600 shadow-md">
          Ainda não há vídeos disponíveis. Volte em breve.
        </div>
      ) : (
        <ul className="relative space-y-6">
          {list.map((row) => (
            <li key={row.id}>
              <Link
                href={`/aluno/tutoriais/${row.id}`}
                className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#c8d6e6] bg-white/95 p-4 shadow-md shadow-slate-200/50 transition hover:border-[#F66828]/40 hover:shadow-lg sm:flex-row sm:items-stretch sm:p-5"
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-200 sm:max-w-[280px]">
                  {row.thumbnail_url ? (
                    <Image
                      src={row.thumbnail_url}
                      alt=""
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, 280px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full min-h-[140px] items-center justify-center text-xs text-slate-500">
                      Vídeo
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                    <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#D9571E] shadow">
                      Assistir
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#D9571E]">
                    {row.title}
                  </h2>
                  {row.description ? (
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                      {row.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
