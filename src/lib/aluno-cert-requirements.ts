function strFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/**
 * Todos os campos obrigatórios para o admin clicar em “Iniciar certificado”.
 *
 * Antes exigia também `certificado_solicitado_em`, mas no fluxo atual a
 * solicitação do aluno passou a ser por curso (tabela `proeduka_curso_pedidos`).
 * O admin clica "Iniciar certificação" a partir dessa lista — não há mais
 * uma "solicitação global" na ficha do aluno.
 */
export function isCertificationDataComplete(row: Record<string, unknown>): boolean {
  return getCertificationBlockers(row).length === 0;
}

export function getCertificationBlockers(row: Record<string, unknown>): string[] {
  const missing: string[] = [];

  if (!strFilled(row.numero_matricula)) {
    missing.push("Número da matrícula");
  }

  return missing;
}
