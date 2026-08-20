import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";

/** URL temporária para exibir/baixar arquivo (Backblaze B2). */
export async function getSignedStorageUrl(
  path: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  if (!isB2Configured()) {
    return null;
  }
  try {
    const client = getB2S3Client();
    const bucket = getB2BucketName();
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: path });
    return await getSignedUrl(client, cmd, { expiresIn });
  } catch {
    return null;
  }
}
