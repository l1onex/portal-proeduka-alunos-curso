/**
 * Coluna do nome em public.profiles.
 * Padrão: `nome` (bases Supabase típicas do projeto). Para usar `full_name`, defina
 * PROFILES_NAME_COLUMN=full_name no .env.
 */
export type ProfileNameColumn = "full_name" | "nome";

export function profileNameColumn(): ProfileNameColumn {
  const v = process.env.PROFILES_NAME_COLUMN?.trim().toLowerCase();
  if (v === "full_name") return "full_name";
  return "nome";
}

/** Payload só com o campo de nome (insert/update em profiles). */
export function profileNameField(name: string): Record<string, string> {
  return { [profileNameColumn()]: name };
}
