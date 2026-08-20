/**
 * Mapeamento da tabela de alunos no Supabase (colunas do teu schema).
 * Colunas de pasta Google Drive só existem na BD — não são usadas na UI nem na lógica de pendências.
 */

import { isCertificationDataComplete } from "@/lib/aluno-cert-requirements";

export function getAlunosTableName(): string {
  return (
    process.env.NEXT_PUBLIC_ALUNOS_TABLE?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE?.trim() ||
    "proeduka_alunos"
  );
}

/** Preenchidos ao clicar “Iniciar certificado” (auditoria para o master). */
export const COLUNA_HOMOLOGADO_EM = "homologado_em" as const;
export const COLUNA_HOMOLOGADO_POR = "homologado_por" as const;

/** Flag administrativa — não é “campo a preencher” nas pendências. */
export const COLUNA_DESISTENTE = "desistente" as const;
export const COLUNA_INADIMPLENTE = "inadimplente" as const;
/** Preenchido no portal quando o aluno conclui “Solicitar certificado”. */
export const COLUNA_CERTIFICADO_SOLICITADO_EM =
  "certificado_solicitado_em" as const;

/** Colunas que a app ignora de propósito (armazenamento externo / só BD). */
export const COLUNAS_IGNORADAS_APP = new Set([
  "pasta mae",
  "pasta documentos",
  "pasta certificado",
]);

/**
 * Colunas do aluno que NÃO devem ir nos payloads de webhook (`certificate_print`,
 * `certificate_requested`, etc.) — tipicamente porque são dados redundantes
 * (o webhook já carrega matrícula/registro em campos próprios) ou privados.
 */
export const COLUNAS_WEBHOOK_IGNORADAS = new Set([
  // Documentos pessoais (privacidade / não relevantes p/ automação do certificado)
  "reservista",
  "certidao_nascimento",
  "certidao_casamento",
  "historico_escolar",
  // Registro escolar já vem como campos próprios do payload
  "numero_registro",
  "livro",
  "pagina",
]);

/** Campos de sistema — não entram na lista “o que falta preencher” para o aluno. */
export const COLUNAS_SISTEMA_SEM_PENDENCIA = new Set([
  "id",
  "created_at",
  "data",
  COLUNA_DESISTENTE,
  COLUNA_INADIMPLENTE,
]);

/** Documentos / flags (valor truthy = entregue; null/falso = pendente). */
export const DOC_KEYS_ORDERED = [
  "identidade",
  "Comprovante de residência",
] as const;

export type DocKey = (typeof DOC_KEYS_ORDERED)[number];

export const DOC_LABELS: Record<DocKey, string> = {
  identidade: "Identidade (RG)",
  "Comprovante de residência": "Comprovante de residência",
};

/** Informações cadastrais (valor nulo ou vazio = pendente). */
export const INFO_KEYS_ORDERED = [
  "nome",
  "dt_nasc",
  "sexo",
  "possui_deficiencia",
  "nacionalidade",
  "naturalidade_uf",
  "naturalidade_cidade",
  "nome_mae",
  "nome_pai",
  "estado_civil",
  "profissao",
  "telefone",
  "email",
  "cpf",
  "rg",
  "identidade_data_exp",
  "orgao_expedidor",
  "cep",
  "estado",
  "cidade",
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "unidade",
  "consultor",
  "curso",
] as const;

export type InfoKey = (typeof INFO_KEYS_ORDERED)[number];

/**
 * Não entra em pendências nem destaque "falta preencher" quando vazio.
 * `escolaridade` NÃO está aqui — o aluno é OBRIGADO a preenchê-la.
 */
export const INFO_KEYS_OPCIONAIS = new Set<InfoKey>([
  "complemento",
  "unidade",
  "consultor",
  "curso",
]);

/**
 * Colunas extra da tabela `proeduka_alunos` que NÃO estão em
 * `INFO_KEYS_ORDERED` mas são editáveis pela ficha (admin e aluno).
 *
 * Usado pelas rotas `/api/aluno/dados` e `/api/admin/students/[id]/ficha`
 * para incluir estas colunas na whitelist do PATCH.
 *
 * Adicione aqui cada nova coluna que entre na ficha (admin ou aluno).
 */
export const EXTRA_ALUNO_PATCH_COLUMNS = ["escolaridade"] as const;
export type ExtraAlunoPatchColumn = (typeof EXTRA_ALUNO_PATCH_COLUMNS)[number];

export const INFO_LABELS: Record<InfoKey, string> = {
  nome: "Nome completo",
  email: "E-mail",
  sexo: "Sexo",
  estado_civil: "Estado civil",
  dt_nasc: "Data de nascimento",
  cpf: "CPF",
  rg: "RG",
  orgao_expedidor: "Órgão expedidor",
  identidade_data_exp: "Data de expedição (RG)",
  possui_deficiencia: "Possui deficiência?",
  telefone: "Telefone",
  unidade: "Unidade",
  consultor: "Consultor",
  curso: "Curso",
  nome_pai: "Nome do pai",
  nome_mae: "Nome da mãe",
  profissao: "Profissão",
  nacionalidade: "Nacionalidade",
  naturalidade_uf: "Naturalidade",
  naturalidade_cidade: "Município de naturalidade",
  cep: "CEP",
  endereco: "Endereço",
  numero: "Número",
  complemento: "Complemento (opcional)",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "Estado",
};

export function isTruthyFlag(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t === "true" || t === "1" || t === "sim";
  }
  return false;
}

export function isMissingValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  return false;
}

/** Sexo conforme documento: usado por fluxos legados de matrícula. */
export function normalizeSexo(
  row: Record<string, unknown> | null | undefined,
): "masculino" | "feminino" | null {
  const raw = (typeof row?.sexo === "string" ? row.sexo : "").trim().toLowerCase();
  if (raw === "masculino" || raw === "m" || raw === "masc") return "masculino";
  if (raw === "feminino" || raw === "f" || raw === "fem" || raw === "feminina") {
    return "feminino";
  }
  return null;
}

/** Documentos que entram em pendências e %. */
export function docKeysForRow(row: Record<string, unknown>): DocKey[] {
  void row;
  return [...DOC_KEYS_ORDERED];
}

/** Todos os documentos exigidos para a linha estão marcados como enviados. */
export function isRowDocsComplete(row: Record<string, unknown>): boolean {
  for (const k of docKeysForRow(row)) {
    if (!isTruthyFlag(row[k])) return false;
  }
  return true;
}

/**
 * Admin pode editar suspensão da validação pública:
 * — após aprovação (`final`), sempre; ou
 * — quando cadastro + dados de certificação estão completos (antes de aprovar).
 */
export function canEditValidacaoSuspensa(row: Record<string, unknown>): boolean {
  if (isTruthyFlag(row.final)) return true;
  if (!isRowDocsComplete(row)) return false;
  return isCertificationDataComplete(row);
}

/** Bloqueio administrativo da validação pública (coluna `validacao_suspensa`). */
export function isValidacaoSuspensa(row: Record<string, unknown>): boolean {
  const v = row.validacao_suspensa;
  if (v === true || v === 1) return true;
  if (typeof v === "string" && v.trim().toLowerCase() === "true") return true;
  return false;
}

export type PendenciaItem = { key: string; label: string };

export type PendenciasAluno = {
  informacoes: PendenciaItem[];
  documentos: PendenciaItem[];
  totalCount: number;
};

export function computePendencias(
  row: Record<string, unknown> | null | undefined,
): PendenciasAluno {
  if (!row) {
    return { informacoes: [], documentos: [], totalCount: 0 };
  }

  const informacoes: PendenciaItem[] = [];
  for (const key of INFO_KEYS_ORDERED) {
    if (
      COLUNAS_IGNORADAS_APP.has(key) ||
      COLUNAS_SISTEMA_SEM_PENDENCIA.has(key) ||
      INFO_KEYS_OPCIONAIS.has(key)
    ) {
      continue;
    }
    if (key === "naturalidade_cidade") {
      continue;
    }
    if (key === "naturalidade_uf") {
      const u = row.naturalidade_uf;
      const c = row.naturalidade_cidade;
      if (isMissingValue(u) || isMissingValue(c)) {
        informacoes.push({ key: "naturalidade_uf", label: "Naturalidade" });
      }
      continue;
    }
    const v = row[key];
    if (isMissingValue(v)) {
      informacoes.push({ key, label: INFO_LABELS[key] ?? key });
    }
  }

  /**
   * `escolaridade` NÃO está em `INFO_KEYS_ORDERED` (para evitar duplicação
   * na UI da ficha do admin), mas é obrigatória para o aluno. Verificamos
   * aqui diretamente para a contar como pendência.
   */
  const esc = row.escolaridade;
  if (isMissingValue(esc)) {
    informacoes.push({ key: "escolaridade", label: "Escolaridade" });
  }

  const documentos: PendenciaItem[] = [];
  for (const key of docKeysForRow(row)) {
    if (COLUNAS_IGNORADAS_APP.has(key)) continue;
    const v = row[key];
    if (!isTruthyFlag(v)) {
      documentos.push({ key, label: DOC_LABELS[key] ?? key });
    }
  }

  return {
    informacoes,
    documentos,
    totalCount: informacoes.length + documentos.length,
  };
}

export function isDesistente(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  const v = row[COLUNA_DESISTENTE];
  return v === true || v === "true" || v === 1;
}

export function isInadimplente(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  const v = row[COLUNA_INADIMPLENTE];
  return v === true || v === "true" || v === 1;
}

/** Aluno já pediu análise do certificado no portal (timestamp preenchido). */
export function isCertificadoSolicitado(
  row: Record<string, unknown> | null,
): boolean {
  if (!row) return false;
  const v = row[COLUNA_CERTIFICADO_SOLICITADO_EM];
  if (v == null) return false;
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  const s = String(v).trim();
  return s.length > 0;
}

export function alunoCardStatus(row: Record<string, unknown> | null): string {
  if (!row) return "pending";
  if (isDesistente(row)) return "desistente";
  if (isInadimplente(row)) return "inadimplente";
  const p = computePendencias(row);
  if (p.totalCount > 0) return "pending";
  if (isTruthyFlag(row.final)) return "approved";
  if (!isCertificadoSolicitado(row)) return "aguardando_solicitacao";
  return "em_analise";
}
