import { sanitizedPublicTableName } from "@/lib/db/public-schema";

/** `public."tabela"` com identificador validado. */
export function alunosFqn(): string {
  return `public."${sanitizedPublicTableName()}"`;
}
