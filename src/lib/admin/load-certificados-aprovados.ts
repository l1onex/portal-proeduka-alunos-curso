/**
 * Lista as certificações APROVADAS (pedidos com status = 'concluido').
 * Cada linha traz snapshot do curso + aluno + quem aprovou + quando.
 *
 * Substitui `loadCertificadosHomologados` (que era baseado apenas em
 * `proeduka_alunos.final = true` sem indicação de curso).
 */

import { getSql } from "@/lib/db/client";
import { profileDisplayName } from "@/lib/profile-display-name";
import { isPgUndefinedFunction } from "@/lib/db/pg-error";

export type CertificadoAprovadoListItem = {
  id: string; // id do pedido
  alunoId: string;
  nomeAluno: string | null;
  emailAluno: string | null;
  cursoId: string;
  cursoNome: string | null;
  cursoImageKey: string | null;
  aprovadoEmIso: string | null;
  aprovadoPorNome: string | null;
  aprovadoPorEmail: string | null;
};

export async function loadCertificadosAprovados(): Promise<{
  rows: CertificadoAprovadoListItem[];
  error: string | null;
}> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return {
      rows: [],
      error: "Defina DATABASE_URL no ambiente para listar aprovações.",
    };
  }

  let raw: Array<{
    id: string;
    aluno_id: string;
    aluno_nome: string | null;
    aluno_email: string | null;
    curso_id: string;
    curso_nome: string | null;
    curso_image_key: string | null;
    decisao_em: string | null;
    decisao_por: string | null;
  }>;

  try {
    raw = await sql<Array<{
      id: string;
      aluno_id: string;
      aluno_nome: string | null;
      aluno_email: string | null;
      curso_id: string;
      curso_nome: string | null;
      curso_image_key: string | null;
      decisao_em: string | null;
      decisao_por: string | null;
    }>>`
      SELECT
        p.id::text                              AS id,
        p.aluno_id::text                        AS aluno_id,
        a.nome                                  AS aluno_nome,
        a.email                                 AS aluno_email,
        p.curso_id::text                        AS curso_id,
        c.nome                                  AS curso_nome,
        c.image_key                             AS curso_image_key,
        p.decisao_em::text                      AS decisao_em,
        p.decisao_por::text                     AS decisao_por
      FROM public.proeduka_curso_pedidos p
      LEFT JOIN public.proeduka_alunos a ON a.id = p.aluno_id
      LEFT JOIN public.proeduka_cursos  c ON c.id = p.curso_id
      WHERE p.status = 'concluido'
      ORDER BY p.decisao_em DESC NULLS LAST, p.criado_em DESC
    `;
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "Erro a listar certificados.",
    };
  }

  const porIds = [
    ...new Set(
      raw
        .map((r) => r.decisao_por)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];

  const profileById = new Map<string, Record<string, unknown>>();
  const emailStaffById = new Map<string, string | null>();
  if (porIds.length > 0) {
    try {
      const profRows = await sql<Record<string, unknown>[]>`
        SELECT * FROM public.profiles_rows_by_ids(${porIds}::uuid[])
      `;
      for (const p of profRows) {
        const pid = String((p as Record<string, unknown>).id ?? "");
        if (pid) profileById.set(pid, p);
      }
    } catch (e) {
      if (!isPgUndefinedFunction(e)) throw e;
      const profRows = await sql<Record<string, unknown>[]>`
        SELECT * FROM public.profiles WHERE id IN ${sql(porIds)}
      `;
      for (const p of profRows) {
        const pid = String((p as Record<string, unknown>).id ?? "");
        if (pid) profileById.set(pid, p);
      }
    }
    const users = await sql<Array<{ id: string; email: string | null }>>`
      SELECT id::text AS id, email FROM auth.users WHERE id IN ${sql(porIds)}
    `;
    for (const u of users) {
      if (typeof u.id === "string" && u.id.length > 0) {
        emailStaffById.set(u.id, u.email ?? null);
      }
    }
  }

  const rows: CertificadoAprovadoListItem[] = raw.map((r) => {
    const uid: string | null = r.decisao_por;
    const prof = typeof uid === "string" ? profileById.get(uid) : undefined;
    const emailStaff =
      typeof uid === "string" ? emailStaffById.get(uid) ?? null : null;
    return {
      id: r.id,
      alunoId: r.aluno_id,
      nomeAluno: r.aluno_nome?.trim() || null,
      emailAluno: r.aluno_email?.trim() || null,
      cursoId: r.curso_id,
      cursoNome: r.curso_nome?.trim() || null,
      cursoImageKey: r.curso_image_key,
      aprovadoEmIso: r.decisao_em,
      aprovadoPorNome: profileDisplayName(prof) ?? emailStaff,
      aprovadoPorEmail: emailStaff,
    };
  });

  return { rows, error: null };
}