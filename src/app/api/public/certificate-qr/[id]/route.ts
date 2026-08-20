import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Descarga pública do PNG do QR (lê o objeto já gravado no B2).
 * URL estável para colar no certificado quando não há CDN no bucket.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim() || !UUID_RE.test(id.trim())) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  if (!isB2Configured()) {
    return NextResponse.json(
      { error: "Armazenamento não configurado." },
      { status: 503 },
    );
  }

  const key = `students/${id.trim()}/qr-certificado.png`;
  try {
    const client = getB2S3Client();
    const bucket = getB2BucketName();
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = out.Body;
    if (!body) {
      return NextResponse.json({ error: "Ficheiro vazio." }, { status: 404 });
    }
    const buf = await body.transformToByteArray();
    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "QR não encontrado." }, { status: 404 });
  }
}
