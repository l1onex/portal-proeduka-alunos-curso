import bcrypt from "bcryptjs";

export async function verifyAuthPasswordHash(
  plain: string,
  encryptedPassword: string | null | undefined,
): Promise<boolean> {
  if (!encryptedPassword?.trim()) return false;
  const h = encryptedPassword.trim();
  if (!h.startsWith("$2")) {
    return false;
  }
  return bcrypt.compare(plain, h);
}

/** Formato bcrypt compatível com GoTrue (`auth.users.encrypted_password`). */
export async function hashAuthPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
