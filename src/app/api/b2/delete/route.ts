import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { getStudentSession } from "@/lib/api/student-session";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";
import { assertAnyAllowedKey } from "@/lib/b2/object-keys";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isB2Configured()) {
    return NextResponse.json(
      { error: "Armazenamento não configurado." },
      { status: 503 },
    );
  }

  const staff = await getStaffSession();
  const student = await getStudentSession();
  if (!staff && !student) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { keys?: unknown };
  try {
    body = (await request.json()) as { keys?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const rawKeys = body.keys;
  if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
    return NextResponse.json(
      { error: "Informe ao menos uma chave (keys) de objeto." },
      { status: 400 },
    );
  }

  const keys = rawKeys
    .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
    .map((k) => k.trim());

  if (keys.length === 0) {
    return NextResponse.json({ error: "Nenhuma chave válida." }, { status: 400 });
  }

  for (const key of keys) {
    const auth = await assertAnyAllowedKey(key, staff, student);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }
  }

  try {
    const client = getB2S3Client();
    const bucket = getB2BucketName();
    for (const key of keys) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao remover no armazenamento.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
