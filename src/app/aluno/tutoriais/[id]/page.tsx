import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TutorialVideoEmbed } from "@/components/aluno/tutorial-video-embed";
import { getStudentSession } from "@/lib/api/student-session";
import { getSql } from "@/lib/db/client";

type Props = { params: Promise<{ id: string }> };

export default async function AlunoTutorialVideoPage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login?next=/aluno/tutoriais");

  const { id } = await params;
  const sql = getSql();

  let row:
    | {
        id: string;
        title: string;
        description: string | null;
        video_url: string | null;
      }
    | undefined;

  try {
    const hits = await sql<Array<{
      id: string;
      title: string;
      description: string | null;
      video_url: string | null;
    }>>`
      SELECT id::text AS id,
             title::text AS title,
             description::text AS description,
             video_url::text AS video_url
      FROM public.tutorial_videos
      WHERE id::text = ${id}
      LIMIT 1
    `;
    row = hits[0];
  } catch {
    notFound();
  }

  if (!row?.video_url) notFound();

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/aluno/tutoriais"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white px-4 py-2 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50"
        >
          ← Voltar aos tutoriais
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#D9571E] sm:text-3xl">
          {row.title}
        </h1>
        {row.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {row.description}
          </p>
        ) : null}
      </header>

      <TutorialVideoEmbed videoUrl={row.video_url} />
    </div>
  );
}
