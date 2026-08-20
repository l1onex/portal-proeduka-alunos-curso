import { profileDisplayName } from "@/lib/profile-display-name";
import {
  COLUNA_HOMOLOGADO_EM,
  COLUNA_HOMOLOGADO_POR,
} from "@/lib/aluno-tabela";
import { getSql } from "@/lib/db/client";
import { isPgUndefinedFunction } from "@/lib/db/pg-error";
import { alunosFqn } from "@/lib/db/alunos-table";

export type CertificadoHomologadoListItem = {
  studentId: string;
  nomeAluno: string | null;
  emailAluno: string | null;
  homologadoEmIso: string | null;
  homologadoPorNome: string | null;
  homologadoPorEmail: string | null;
};

export async function loadCertificadosHomologados(): Promise<{
  rows: CertificadoHomologadoListItem[];
  error: string | null;
}> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return {
      rows: [],
      error:
        "Defina DATABASE_URL no ambiente (.env/stack) para listar aprovações.",
    };
  }

  const fq = alunosFqn();
  let rawRows: Record<string, unknown>[];
  try {
    rawRows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT id::text AS id, nome, email, final, "${COLUNA_HOMOLOGADO_EM}", "${COLUNA_HOMOLOGADO_POR}"
       FROM ${fq} WHERE final = true`,
      [],
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      rows: [],
      error:
        msg.includes("homologado") || /42703/i.test(msg)
          ? "Crie as colunas homologado_em e homologado_por na tabela de alunos (ver SQL na documentação do deploy)."
          : msg,
    };
  }

  const list = rawRows;
  const porIds = [
    ...new Set(
      list
        .map((r) => r[COLUNA_HOMOLOGADO_POR])
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];

  const profileById = new Map<string, Record<string, unknown>>();
  if (porIds.length > 0) {
    let profRows: Record<string, unknown>[];
    try {
      profRows = await sql<Record<string, unknown>[]>`
      SELECT * FROM public.profiles_rows_by_ids(${porIds}::uuid[])
    `;
    } catch (e) {
      if (!isPgUndefinedFunction(e)) throw e;
      profRows = await sql<Record<string, unknown>[]>`
        SELECT * FROM public.profiles
        WHERE id IN ${sql(porIds)}
      `;
    }
    for (const p of profRows) {
      const rec = p as Record<string, unknown>;
      const pid = String(rec.id ?? "");
      if (pid) profileById.set(pid, rec);
    }
  }

  const emailStaffById = new Map<string, string>();
  if (porIds.length > 0) {
    const users = await sql<Array<{ id: string; email: string | null }>>`
      SELECT id::text AS id, email FROM auth.users WHERE id IN ${sql(porIds)}
    `;
    for (const u of users) {
      if (u.id && typeof u.email === "string") emailStaffById.set(u.id, u.email);
    }
  }

  const rowsOut: CertificadoHomologadoListItem[] = list.map((r) => {
    const sid = String(r.id ?? "");
    const uid = r[COLUNA_HOMOLOGADO_POR];
    const uidStr = typeof uid === "string" ? uid : null;
    const prof = uidStr ? profileById.get(uidStr) : undefined;
    const emailStaff =
      uidStr && emailStaffById.has(uidStr)
        ? emailStaffById.get(uidStr) ?? null
        : null;

    return {
      studentId: sid,
      nomeAluno: typeof r.nome === "string" ? r.nome.trim() || null : null,
      emailAluno: typeof r.email === "string" ? r.email.trim() || null : null,
      homologadoEmIso:
        typeof r[COLUNA_HOMOLOGADO_EM] === "string"
          ? r[COLUNA_HOMOLOGADO_EM]
          : r[COLUNA_HOMOLOGADO_EM] instanceof Date
            ? (r[COLUNA_HOMOLOGADO_EM] as Date).toISOString()
            : null,
      homologadoPorNome: profileDisplayName(prof) ?? emailStaff,
      homologadoPorEmail: emailStaff,
    };
  });

  rowsOut.sort((a, b) => {
    const ta = a.homologadoEmIso ? Date.parse(a.homologadoEmIso) : 0;
    const tb = b.homologadoEmIso ? Date.parse(b.homologadoEmIso) : 0;
    return tb - ta;
  });

  return { rows: rowsOut, error: null };
}
