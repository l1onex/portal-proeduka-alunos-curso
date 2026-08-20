/**
 * Helpers de leitura/escrita da tabela `proeduka_aluno_cursos`
 * (relação aluno ↔ curso).
 */

import { getSql } from "@/lib/db/client";
import type { CursoRow } from "@/lib/api/cursos";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";

export type AlunoCursoStatus = "a_cursar" | "concluido";

export type AlunoCursoRow = CursoRow & {
  /** UUID da linha em `proeduka_aluno_cursos`. */
  aluno_curso_id: string;
  /** Status atual (a_cursar | concluido). */
  status: AlunoCursoStatus;
  /** Data de criação (atribuição). */
  criado_em: string;
  /** Data em que foi marcado como concluído (null enquanto a_cursar). */
  concluido_em: string | null;
  /** URL pré-assinada (B2) já pronta para exibir a thumbnail. */
  image_url: string | null;
};

/** Assina as URLs de thumbnail (B2) para uma lista de cursos. */
async function withImageUrls<
  T extends { image_key: string | null },
>(rows: T[]): Promise<Array<T & { image_url: string | null }>> {
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      image_url: await getSignedStorageUrl(r.image_key),
    })),
  );
}

export type CursoDisponivelRow = CursoRow & { image_url: string | null };

/** Lista todos os cursos atribuídos a um aluno (qualquer status). */
export async function listCursosAluno(
  alunoId: string,
): Promise<AlunoCursoRow[]> {
  const sql = getSql();
  const rows = await sql<AlunoCursoRow[]>`
    SELECT
      c.id::text                       AS id,
      c.nome                           AS nome,
      c.descricao                      AS descricao,
      c.image_key                      AS image_key,
      c.criado_em::text                AS criado_em,
      c.criado_por::text               AS criado_por,
      c.atualizado_em::text            AS atualizado_em,
      ac.id::text                      AS aluno_curso_id,
      ac.status                        AS status,
      ac.criado_em::text               AS criado_em,
      ac.concluido_em::text            AS concluido_em
    FROM public.proeduka_aluno_cursos ac
    JOIN public.proeduka_cursos c ON c.id = ac.curso_id
    WHERE ac.aluno_id = ${alunoId}::uuid
    ORDER BY ac.criado_em DESC
  `;
  return withImageUrls(rows);
}

/** Atribui um curso a um aluno (idempotente: se já existir, devolve o existente). */
export async function atribuirCursoAluno(params: {
  alunoId: string;
  cursoId: string;
  /** UUID do staff que atribuiu (pode ser null em integrações via API Key). */
  atribuidoPor: string | null;
}): Promise<AlunoCursoRow> {
  const sql = getSql();
  // `ON CONFLICT DO NOTHING` + RETURNING — se já existir, devolve a linha
  // existente (lida logo a seguir).
  const inserted = await sql<AlunoCursoRow[]>`
    INSERT INTO public.proeduka_aluno_cursos
      (aluno_id, curso_id, atribuido_por)
    VALUES
      (
        ${params.alunoId}::uuid,
        ${params.cursoId}::uuid,
        ${params.atribuidoPor}::uuid
      )
    ON CONFLICT (aluno_id, curso_id) DO NOTHING
    RETURNING
      aluno_id::text  AS aluno_id,
      curso_id::text  AS id,
      'a_cursar'      AS status,
      criado_em::text AS criado_em
  `;

  if (inserted[0]) {
    return listCursosAluno(params.alunoId).then((rows) => {
      const row = rows.find((r) => r.id === params.cursoId);
      if (!row) throw new Error("Falha ao carregar curso atribuído.");
      return row;
    });
  }

  // Já existia — devolver o existente.
  const rows = await listCursosAluno(params.alunoId);
  const row = rows.find((r) => r.id === params.cursoId);
  if (!row) throw new Error("Falha ao localizar curso atribuído.");
  return row;
}

/** Remove a atribuição (aluno deixa de ter o curso). */
export async function desatribuirCursoAluno(params: {
  alunoId: string;
  cursoId: string;
}): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM public.proeduka_aluno_cursos
    WHERE aluno_id = ${params.alunoId}::uuid
      AND curso_id = ${params.cursoId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

/** Lista cursos disponíveis que o aluno AINDA não tem (para o select do admin). */
export async function listCursosDisponiveisParaAluno(
  alunoId: string,
): Promise<CursoDisponivelRow[]> {
  const sql = getSql();
  const rows = await sql<CursoRow[]>`
    SELECT
      c.id::text             AS id,
      c.nome                 AS nome,
      c.descricao            AS descricao,
      c.image_key            AS image_key,
      c.criado_em::text      AS criado_em,
      c.criado_por::text     AS criado_por,
      c.atualizado_em::text  AS atualizado_em
    FROM public.proeduka_cursos c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.proeduka_aluno_cursos ac
      WHERE ac.aluno_id = ${alunoId}::uuid
        AND ac.curso_id = c.id
    )
    ORDER BY c.nome ASC
  `;
  return withImageUrls(rows);
}