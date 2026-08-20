/**
 * Helpers de leitura/escrita da tabela `proeduka_curso_solicitacoes`
 * (pedidos do aluno para ser adicionado a um curso).
 */

import { getSql } from "@/lib/db/client";

export type CursoSolicitacaoStatus = "pendente" | "aprovado" | "recusado";

export type CursoSolicitacaoRow = {
  id: string;
  aluno_id: string;
  curso_id: string;
  status: CursoSolicitacaoStatus;
  criado_em: string;
  decisao_em: string | null;
  decisao_por: string | null;
  motivo: string | null;
  // JOIN
  aluno_nome?: string;
  aluno_email?: string;
  curso_nome?: string;
  curso_image_key?: string | null;
};

/** Lista pedidos (com dados do aluno + curso). Para a página admin. */
export async function listCursoSolicitacoesAdmin(
  status?: CursoSolicitacaoStatus,
): Promise<CursoSolicitacaoRow[]> {
  const sql = getSql();
  return sql<CursoSolicitacaoRow[]>`
    SELECT
      s.id::text                  AS id,
      s.aluno_id::text            AS aluno_id,
      s.curso_id::text            AS curso_id,
      s.status                    AS status,
      s.criado_em::text           AS criado_em,
      s.decisao_em::text          AS decisao_em,
      s.decisao_por::text         AS decisao_por,
      s.motivo                    AS motivo,
      a.nome                      AS aluno_nome,
      a.email                     AS aluno_email,
      c.nome                      AS curso_nome,
      c.image_key                 AS curso_image_key
    FROM public.proeduka_curso_solicitacoes s
    LEFT JOIN public.proeduka_alunos a ON a.id = s.aluno_id
    LEFT JOIN public.proeduka_cursos  c ON c.id = s.curso_id
    ${status ? sql`WHERE s.status = ${status}` : sql``}
    ORDER BY s.criado_em DESC
  `;
}

/** Lista pedidos do próprio aluno (para /aluno/cursos). */
export async function listCursoSolicitacoesAluno(
  alunoId: string,
): Promise<CursoSolicitacaoRow[]> {
  const sql = getSql();
  return sql<CursoSolicitacaoRow[]>`
    SELECT
      s.id::text                  AS id,
      s.aluno_id::text            AS aluno_id,
      s.curso_id::text            AS curso_id,
      s.status                    AS status,
      s.criado_em::text           AS criado_em,
      s.decisao_em::text          AS decisao_em,
      s.decisao_por::text         AS decisao_por,
      s.motivo                    AS motivo,
      c.nome                      AS curso_nome,
      c.image_key                 AS curso_image_key
    FROM public.proeduka_curso_solicitacoes s
    LEFT JOIN public.proeduka_cursos c ON c.id = s.curso_id
    WHERE s.aluno_id = ${alunoId}::uuid
    ORDER BY s.criado_em DESC
  `;
}

/** Devolve o pedido PENDENTE do aluno para um curso (se existir). */
export async function getCursoSolicitacaoPendente(
  alunoId: string,
  cursoId: string,
): Promise<CursoSolicitacaoRow | null> {
  const sql = getSql();
  const rows = await sql<CursoSolicitacaoRow[]>`
    SELECT
      s.id::text                  AS id,
      s.aluno_id::text            AS aluno_id,
      s.curso_id::text            AS curso_id,
      s.status                    AS status,
      s.criado_em::text           AS criado_em,
      s.decisao_em::text          AS decisao_em,
      s.decisao_por::text         AS decisao_por,
      s.motivo                    AS motivo
    FROM public.proeduka_curso_solicitacoes s
    WHERE s.aluno_id = ${alunoId}::uuid
      AND s.curso_id = ${cursoId}::uuid
      AND s.status = 'pendente'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Cria um pedido novo (idempotente: se já existir um pedido pendente
 * para o mesmo aluno/curso, devolve o existente).
 */
export async function criarCursoSolicitacao(params: {
  alunoId: string;
  cursoId: string;
}): Promise<CursoSolicitacaoRow> {
  const sql = getSql();
  await sql`
    INSERT INTO public.proeduka_curso_solicitacoes
      (aluno_id, curso_id, status)
    VALUES
      (${params.alunoId}::uuid, ${params.cursoId}::uuid, 'pendente')
    ON CONFLICT ON CONSTRAINT proeduka_curso_solicitacoes_unique_active
      DO NOTHING
  `;
  const ped = await getCursoSolicitacaoPendente(params.alunoId, params.cursoId);
  if (!ped) throw new Error("Falha ao criar o pedido.");
  return ped;
}

/** Aprova um pedido + atribui o curso ao aluno. */
export async function aprovarCursoSolicitacao(params: {
  solicitacaoId: string;
  decididoPor: string;
}): Promise<CursoSolicitacaoRow> {
  const sql = getSql();

  // 1. Carrega o pedido.
  const rows = await sql<CursoSolicitacaoRow[]>`
    SELECT id::text AS id, aluno_id::text AS aluno_id, curso_id::text AS curso_id,
           status AS status, criado_em::text AS criado_em,
           decisao_em::text AS decisao_em, decisao_por::text AS decisao_por,
           motivo AS motivo
    FROM public.proeduka_curso_solicitacoes
    WHERE id = ${params.solicitacaoId}::uuid
    LIMIT 1
  `;
  const ped = rows[0];
  if (!ped) throw new Error("Pedido não encontrado.");
  if (ped.status !== "pendente") {
    throw new Error(`Pedido já decidido (status: ${ped.status}).`);
  }

  // 2. Atribui o curso ao aluno (idempotente).
  await sql`
    INSERT INTO public.proeduka_aluno_cursos
      (aluno_id, curso_id, atribuido_por)
    VALUES
      (${ped.aluno_id}::uuid, ${ped.curso_id}::uuid, ${params.decididoPor}::uuid)
    ON CONFLICT (aluno_id, curso_id) DO NOTHING
  `;

  // 3. Marca o pedido como aprovado.
  const out = await sql<CursoSolicitacaoRow[]>`
    UPDATE public.proeduka_curso_solicitacoes
    SET status = 'aprovado',
        decisao_em = now(),
        decisao_por = ${params.decididoPor}::uuid,
        motivo = NULL
    WHERE id = ${params.solicitacaoId}::uuid
    RETURNING id::text AS id, aluno_id::text AS aluno_id, curso_id::text AS curso_id,
              status AS status, criado_em::text AS criado_em,
              decisao_em::text AS decisao_em, decisao_por::text AS decisao_por,
              motivo AS motivo
  `;
  if (!out[0]) throw new Error("Falha ao marcar o pedido.");
  return out[0];
}

/** Recusa um pedido (com motivo opcional). */
export async function recusarCursoSolicitacao(params: {
  solicitacaoId: string;
  decididoPor: string;
  motivo?: string | null;
}): Promise<CursoSolicitacaoRow> {
  const sql = getSql();
  const out = await sql<CursoSolicitacaoRow[]>`
    UPDATE public.proeduka_curso_solicitacoes
    SET status = 'recusado',
        decisao_em = now(),
        decisao_por = ${params.decididoPor}::uuid,
        motivo = ${params.motivo ?? null}
    WHERE id = ${params.solicitacaoId}::uuid
      AND status = 'pendente'
    RETURNING id::text AS id, aluno_id::text AS aluno_id, curso_id::text AS curso_id,
              status AS status, criado_em::text AS criado_em,
              decisao_em::text AS decisao_em, decisao_por::text AS decisao_por,
              motivo AS motivo
  `;
  if (!out[0]) throw new Error("Pedido não está pendente.");
  return out[0];
}