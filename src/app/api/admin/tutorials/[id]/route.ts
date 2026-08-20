import { NextResponse } from "next/server";
import { requireMasterSession } from "@/lib/api/require-master";
import { getSql } from "@/lib/db/client";
import {
  parseVideoUrl,
  resolveThumbnailForVideoUrl,
} from "@/lib/video-url";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
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

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  const existingRows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM public.tutorial_videos
    WHERE id::uuid = ${id}::uuid
    LIMIT 1
  `;
  const ex = existingRows[0];

  if (!ex) {
    return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });
  }

  let title = typeof ex.title === "string" ? ex.title : "";
  let description =
    typeof ex.description === "string" ? ex.description : "";
  let videoUrl = typeof ex.video_url === "string" ? ex.video_url : "";
  let thumbnailUrl =
    ex.thumbnail_url === null || ex.thumbnail_url === undefined
      ? null
      : String(ex.thumbnail_url);
  let sortOrder =
    typeof ex.sort_order === "number" && Number.isFinite(ex.sort_order)
      ? Math.trunc(ex.sort_order)
      : 0;

  if (body.title !== undefined) {
    const t = typeof body.title === "string" ? body.title.trim() : "";
    if (!t) {
      return NextResponse.json({ error: "Título inválido." }, { status: 400 });
    }
    title = t;
  }

  if (body.description !== undefined) {
    description =
      typeof body.description === "string" ? body.description.trim() : "";
  }

  if (body.sort_order !== undefined) {
    const n = body.sort_order;
    if (typeof n === "number" && Number.isFinite(n)) {
      sortOrder = Math.trunc(n);
    }
  }

  if (body.video_url !== undefined) {
    const vu =
      typeof body.video_url === "string" ? body.video_url.trim() : "";
    if (!vu) {
      return NextResponse.json({ error: "URL do vídeo inválida." }, { status: 400 });
    }
    const parsed = parseVideoUrl(vu);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "URL não reconhecida. Use um link do YouTube ou do Vimeo (página do vídeo).",
        },
        { status: 400 },
      );
    }
    videoUrl = vu;
    try {
      thumbnailUrl = await resolveThumbnailForVideoUrl(videoUrl, parsed);
    } catch {
      thumbnailUrl = null;
    }
  }

  let data;
  try {
    const out = await sql<Record<string, unknown>[]>`
      UPDATE public.tutorial_videos
      SET title = ${title},
          description = ${description},
          video_url = ${videoUrl},
          thumbnail_url = ${thumbnailUrl},
          sort_order = ${sortOrder},
          updated_at = now()
      WHERE id::uuid = ${id}::uuid
      RETURNING *`;
    data = out[0];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ tutorial: data });
}

export async function DELETE(_request: Request, { params }: Props) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
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

  try {
    await sql`DELETE FROM public.tutorial_videos WHERE id::uuid = ${id}::uuid`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao apagar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
