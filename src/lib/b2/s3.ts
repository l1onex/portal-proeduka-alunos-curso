import { S3Client } from "@aws-sdk/client-s3";

let cached: S3Client | null = null;

/** Cliente S3 para Backblaze B2 (API compatível com S3). */
export function getB2S3Client(): S3Client {
  if (cached) return cached;

  const accessKeyId = process.env.B2_APPLICATION_KEY_ID;
  const secretAccessKey = process.env.B2_APPLICATION_KEY;
  const rawEndpoint = process.env.B2_S3_ENDPOINT;
  const region = process.env.B2_REGION ?? "us-west-000";

  if (!accessKeyId || !secretAccessKey || !rawEndpoint) {
    throw new Error(
      "B2: defina B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY e B2_S3_ENDPOINT.",
    );
  }

  // O SDK exige URL com esquema; aceita o endpoint sem `https://` por conveniência.
  const trimmed = rawEndpoint.trim();
  const endpoint = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  cached = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return cached;
}

export function getB2BucketName(): string {
  const name = process.env.B2_BUCKET_NAME;
  if (!name) {
    throw new Error("B2: defina B2_BUCKET_NAME.");
  }
  return name;
}

export function isB2Configured(): boolean {
  return Boolean(
    process.env.B2_APPLICATION_KEY_ID &&
      process.env.B2_APPLICATION_KEY &&
      process.env.B2_S3_ENDPOINT &&
      process.env.B2_BUCKET_NAME,
  );
}
