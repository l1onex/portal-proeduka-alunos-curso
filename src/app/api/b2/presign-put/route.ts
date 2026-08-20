import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { getStudentSession } from "@/lib/api/student-session";
import { verifyApiKeyRequest } from "@/lib/api/verify-api-key";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";
import { assertStudentKeyAllowed } from "@/lib/b2/object-keys";
import {
  assertAvatarPhotoAllowed,
  parseAvatarObjectKey,
} from "@/lib/student-storage";

export async function POST(request: Request) {
  if (!isB2Configured()) {
    return NextResponse.json(
      {
        error:
          "Backblaze B2 não configurado. Defina as variáveis B2_* no .env.",
      },
      { status: 503 },
    );
  }

  let body: { key?: string; contentType?: string };
  try {
    body = (await request.json()) as { key?: string; contentType?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const contentType =
    typeof body.contentType === "string" && body.contentType.trim()
      ? body.contentType.trim()
      : "application/octet-stream";

  if (!key) {
    return NextResponse.json({ error: "Informe a chave (key) do arquivo." }, { status: 400 });
  }

  const staff = await getStaffSession();
  const student = await getStudentSession();
  const apiKeyOk = await verifyApiKeyRequest(request);

  if (!staff && !student && !apiKeyOk) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const auth = assertStudentKeyAllowed(key, staff, student, apiKeyOk);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const avatar = parseAvatarObjectKey(key);
  if (avatar) {
    const photoPolicy = assertAvatarPhotoAllowed(
      avatar.ext,
      contentType,
    );
    if (!photoPolicy.ok) {
      return NextResponse.json({ error: photoPolicy.error }, { status: 400 });
    }
  }

  try {
    const client = getB2S3Client();
    const bucket = getB2BucketName();
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(client, cmd, { expiresIn: 600 });
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao gerar URL.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
