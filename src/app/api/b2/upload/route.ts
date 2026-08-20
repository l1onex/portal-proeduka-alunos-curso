import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { getStudentSession } from "@/lib/api/student-session";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";
import { assertAnyAllowedKey } from "@/lib/b2/object-keys";
import {
  assertAvatarPhotoAllowed,
  parseAvatarObjectKey,
} from "@/lib/student-storage";

/** Limite por arquivo (upload passa pelo servidor Next.js). */
const MAX_BYTES = 25 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isB2Configured()) {
    return NextResponse.json(
      { error: "Armazenamento não configurado. Defina as variáveis B2_* no ambiente." },
      { status: 503 },
    );
  }

  const staff = await getStaffSession();
  const student = await getStudentSession();
  if (!staff && !student) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível ler o arquivo. Pode ser tamanho acima do limite do servidor ou rede instável.",
      },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const keyRaw = formData.get("key");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const key = typeof keyRaw === "string" ? keyRaw.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "Informe a chave (key) do arquivo." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. Tamanho máximo: ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  const auth = await assertAnyAllowedKey(key, staff, student);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const contentType =
    file.type && file.type.trim() ? file.type.trim() : "application/octet-stream";

  const avatar = parseAvatarObjectKey(key);
  if (avatar) {
    const photoPolicy = assertAvatarPhotoAllowed(avatar.ext, contentType);
    if (!photoPolicy.ok) {
      return NextResponse.json({ error: photoPolicy.error }, { status: 400 });
    }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const client = getB2S3Client();
    const bucket = getB2BucketName();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao enviar ao armazenamento.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
