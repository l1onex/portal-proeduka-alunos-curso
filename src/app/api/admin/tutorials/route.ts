import { NextResponse } from "next/server";
import {
  requireMasterSession,
  requireStaffSession,
} from "@/lib/api/require-master";
import { getSql } from "@/lib/db/client";
import {
  parseVideoUrl,
  resolveThumbnailForVideoUrl,
} from "@/lib/video-url";

export async function GET() {
  const staff = await requireStaffSession();
  if (!staff) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  const data = await sql`SELECT *
    FROM public.tutorial_videos
    ORDER BY sort_order ASC NULLS LAST, created_at DESC`;

  return NextResponse.json({ tutorials: data ?? [] });
}

export async function POST(request: Request) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: {
    title?: unknown;
    description?: unknown;
    video_url?: unknown;
    sort_order?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Informe o título." }, { status: 400 });
  }
  if (!videoUrl) {
    return NextResponse.json({ error: "Informe a URL do vídeo." }, { status: 400 });
  }

  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "URL não reconhecida. Use um link do YouTube ou do Vimeo (página do vídeo).",
      },
      { status: 400 },
    );
  }

  let thumbnail: string | null = null;
  try {
    thumbnail = await resolveThumbnailForVideoUrl(videoUrl, parsed);
  } catch {
    thumbnail = null;
  }

  const sortOrder =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  let tutorial;
  try {
    const rows = await sql<
      Record<string, unknown>[]
    >`INSERT INTO public.tutorial_videos (title, description, video_url, thumbnail_url, sort_order)
      VALUES (${title}, ${description}, ${videoUrl}, ${thumbnail}, ${sortOrder})
      RETURNING *`;
    tutorial = rows[0];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao criar vídeo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ tutorial });
}
