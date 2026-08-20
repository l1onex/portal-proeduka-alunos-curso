import type { ExtraAlunoPatchColumn, InfoKey } from "@/lib/aluno-tabela";
import { brDateStringToDb } from "@/lib/br-date-input";
import { formatCepMask, onlyCepDigits } from "@/lib/viacep";


/** Normaliza valor antes de gravar no Supabase. */
export function normalizeInfoForDb(
  key: InfoKey | ExtraAlunoPatchColumn,
  raw: string,
): string | null {
  const t = raw.trim();
  if (!t) return null;

  // Colunas extra (não-InfoKey) passam pelo `return t` no fim (texto livre).
  // Casos específicos podem ser adicionados aqui.
  if (key === "escolaridade") {
    return t;
  }

  if (key === "naturalidade_uf") {
    const letters = t.toUpperCase().replace(/[^A-Z]/g, "");
    const u = letters.slice(0, 2);
    return u.length === 2 ? u : null;
  }

  if (
    key === "nome_pai" ||
    key === "nome_mae" ||
    key === "profissao" ||
    key === "naturalidade_cidade" ||
    key === "nacionalidade" ||
    key === "orgao_expedidor"
  ) {
    return t.toUpperCase();
  }

  if (key === "possui_deficiencia") {
    const low = t.toLowerCase();
    if (low === "sim" || low === "s") return "Sim";
    if (low === "não" || low === "nao" || low === "n") return "Não";
    return t;
  }

  if (key === "cpf") {
    const d = t.replace(/\D/g, "");
    return d.length ? d : null;
  }

  if (key === "cep") {
    const d = onlyCepDigits(t);
    if (d.length !== 8) return d.length ? formatCepMask(d) : null;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  if (key === "dt_nasc" || key === "identidade_data_exp") {
    return brDateStringToDb(t);
  }

  return t;
}
