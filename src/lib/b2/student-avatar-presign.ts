import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getB2BucketName, getB2S3Client, isB2Configured } from "@/lib/b2/s3";
import {
  avatarPathForStudent,
  AVATAR_B2_EXTENSIONS_FOR_PURGE,
} from "@/lib/student-storage";

/**
 * Gera URL assinada para a foto 3x4 do aluno, testando extensões até achar o objeto no B2.
 * Evita round-trips extra no cliente (presign + troca de extensão).
 */
export async function getStudentAvatarPresignedUrl(
  studentId: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!isB2Configured()) return null;
  const client = getB2S3Client();
  const bucket = getB2BucketName();

  for (const ext of AVATAR_B2_EXTENSIONS_FOR_PURGE) {
    const key = avatarPathForStudent(studentId, ext);
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      continue;
    }
    try {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      return await getSignedUrl(client, cmd, { expiresIn });
    } catch {
      return null;
    }
  }
  return null;
}
