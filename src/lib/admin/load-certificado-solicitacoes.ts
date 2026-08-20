import { COLUNA_CERTIFICADO_SOLICITADO_EM } from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";

export type CertificadoSolicitacaoListItem = {
  studentId: string;
  nomeAluno: string | null;
  emailAluno: string | null;
  solicitadoEmIso: string | null;
};

/** Alunos que já clicaram «Solicitar certificado» no portal (`certificado_solicitado_em`). */
export async function loadCertificadoSolicitacoes(): Promise<{
  rows: CertificadoSolicitacaoListItem[];
  error: string | null;
}> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return {
      rows: [],
      error:
        "Defina DATABASE_URL no ambiente (.env/stack) para listar solicitações.",
    };
  }

  const fq = alunosFqn();
  const col = COLUNA_CERTIFICADO_SOLICITADO_EM;
  try {
    const rawRows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT id::text AS id, nome, email, "${col}"
       FROM ${fq}
       WHERE "${col}" IS NOT NULL
       ORDER BY "${col}" DESC NULLS LAST`,
      [],
    );

    const rowsOut: CertificadoSolicitacaoListItem[] = rawRows.map((r) => ({
      studentId: String(r.id ?? ""),
      nomeAluno: typeof r.nome === "string" ? r.nome.trim() || null : null,
      emailAluno: typeof r.email === "string" ? r.email.trim() || null : null,
      solicitadoEmIso:
        typeof r[col] === "string"
          ? r[col]
          : r[col] instanceof Date
            ? (r[col] as Date).toISOString()
            : null,
    }));

    return { rows: rowsOut.filter((x) => x.studentId.length > 0), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      rows: [],
      error:
        msg.includes("certificado_solicitado") || /42703/i.test(msg)
          ? 'Adicione a coluna certificado_solicitado_em na tabela de alunos (migração «020_certificado_solicitacao»).'
          : msg,
    };
  }
}
