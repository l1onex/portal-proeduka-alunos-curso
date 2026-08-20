import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";

/** URL assinada para leitura (servidor), ex. link no body do webhook. */
export async function getPresignedGetUrlServer(
  key: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!isB2Configured()) return null;
  const client = getB2S3Client();
  const bucket = getB2BucketName();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}
