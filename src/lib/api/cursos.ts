/**
 * Helpers de leitura/escrita da tabela `proeduka_cursos`.
 * Apenas para uso do painel admin (master / admin).
 */

import { getSql } from "@/lib/db/client";

export type CursoRow = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
  criado_em: string;
  criado_por: string | null;
  atualizado_em: string;
};

const CURSOS_TABLE = "proeduka_cursos";

export async function listCursos(): Promise<CursoRow[]> {
  const sql = getSql();
  return sql<CursoRow[]>`
    SELECT
      id::text             AS id,
      nome                 AS nome,
      descricao            AS descricao,
      image_key            AS image_key,
      criado_em::text      AS criado_em,
      criado_por::text     AS criado_por,
      atualizado_em::text  AS atualizado_em
    FROM public.${sql(CURSOS_TABLE)}
    ORDER BY criado_em DESC
  `;
}

export async function getCurso(id: string): Promise<CursoRow | null> {
  const sql = getSql();
  const rows = await sql<CursoRow[]>`
    SELECT
      id::text             AS id,
      nome                 AS nome,
      descricao            AS descricao,
      image_key            AS image_key,
      criado_em::text      AS criado_em,
      criado_por::text     AS criado_por,
      atualizado_em::text  AS atualizado_em
    FROM public.${sql(CURSOS_TABLE)}
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export type CreateCursoInput = {
  nome: string;
  descricao: string | null;
  image_key: string | null;
  criado_por: string;
};

export async function createCurso(input: CreateCursoInput): Promise<CursoRow> {
  const sql = getSql();
  const rows = await sql<CursoRow[]>`
    INSERT INTO public.${sql(CURSOS_TABLE)}
      (nome, descricao, image_key, criado_por)
    VALUES
      (${input.nome}, ${input.descricao}, ${input.image_key}, ${input.criado_por}::uuid)
    RETURNING
      id::text             AS id,
      nome                 AS nome,
      descricao            AS descricao,
      image_key            AS image_key,
      criado_em::text      AS criado_em,
      criado_por::text     AS criado_por,
      atualizado_em::text  AS atualizado_em
  `;
  if (!rows[0]) {
    throw new Error("Falha ao criar curso.");
  }
  return rows[0];
}

export type UpdateCursoInput = {
  nome?: string;
  descricao?: string | null;
  image_key?: string | null;
};

export async function updateCurso(
  id: string,
  input: UpdateCursoInput,
): Promise<CursoRow | null> {
  const sql = getSql();
  // Construção dinâmica do SET (campos opcionais). Usa sql.unsafe com
  // identifiers validados (uuid) — `id` é validado pelo cast ::uuid.
  const sets: string[] = [];
  const params: (string | null)[] = [];
  let i = 1;
  if (typeof input.nome === "string") {
    sets.push(`nome = $${i}`);
    params.push(input.nome);
    i += 1;
  }
  if (input.descricao !== undefined) {
    sets.push(`descricao = $${i}`);
    params.push(input.descricao);
    i += 1;
  }
  if (input.image_key !== undefined) {
    sets.push(`image_key = $${i}`);
    params.push(input.image_key);
    i += 1;
  }
  if (sets.length === 0) return getCurso(id);

  const idIx = i;
  params.push(id);
  const q = `
    UPDATE public.${CURSOS_TABLE}
    SET ${sets.join(", ")}
    WHERE id::text = $${idIx}
    RETURNING
      id::text             AS id,
      nome                 AS nome,
      descricao            AS descricao,
      image_key            AS image_key,
      criado_em::text      AS criado_em,
      criado_por::text     AS criado_por,
      atualizado_em::text  AS atualizado_em
  `;
  const rows = await sql.unsafe<CursoRow[]>(q, params);
  return rows[0] ?? null;
}

export async function deleteCurso(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM public.${sql(CURSOS_TABLE)}
    WHERE id = ${id}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}