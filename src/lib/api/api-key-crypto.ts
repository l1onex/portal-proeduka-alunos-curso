import { createHash, randomBytes } from "node:crypto";

const PREFIX = "pek_";

/** Gera chave opaca e o hash SHA-256 para armazenar. */
export function generateApiKeyPair(): { secret: string; keyHash: string; keyPrefix: string } {
  const secret = `${PREFIX}${randomBytes(32).toString("hex")}`;
  const keyHash = sha256Hex(secret);
  const keyPrefix = `${secret.slice(0, 12)}…`;
  return { secret, keyHash, keyPrefix };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
