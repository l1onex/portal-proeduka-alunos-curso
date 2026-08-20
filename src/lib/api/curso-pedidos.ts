/**
 * Helpers de leitura/escrita da tabela `proeduka_curso_pedidos`.
 */

import { getSql } from "@/lib/db/client";

export type PedidoStatus = "pendente" | "iniciado" | "recusado" | "concluido";

export type CursoPedidoRow = {
  id: string;
  aluno_id: string;
  curso_id: string;
  status: PedidoStatus;
  criado_em: string;
  decisao_em: string | null;
  decisao_por: string | null;
  motivo: string | null;
  // Campos JOIN (preenchidos pelo `listPedidosAdmin`):
  aluno_nome?: string;
  aluno_email?: string;
  curso_nome?: string;
  curso_image_key?: string | null;
};

/** Lista pedidos (com dados do aluno + curso). Para a página admin. */
export async function listPedidosAdmin(
  status?: PedidoStatus,
): Promise<CursoPedidoRow[]> {
  const sql = getSql();
  return sql<CursoPedidoRow[]>`
    SELECT
      p.id::text                            AS id,
      p.aluno_id::text                      AS aluno_id,
      p.curso_id::text                      AS curso_id,
      p.status                              AS status,
      p.criado_em::text                     AS criado_em,
      p.decisao_em::text                    AS decisao_em,
      p.decisao_por::text                   AS decisao_por,
      p.motivo                              AS motivo,
      a.nome                                AS aluno_nome,
      a.email                               AS aluno_email,
      c.nome                                AS curso_nome,
      c.image_key                           AS curso_image_key
    FROM public.proeduka_curso_pedidos p
    LEFT JOIN public.proeduka_alunos a ON a.id = p.aluno_id
    LEFT JOIN public.proeduka_cursos c ON c.id = p.curso_id
    ${status ? sql`WHERE p.status = ${status}` : sql``}
    ORDER BY p.criado_em DESC
  `;
}

/** Lista pedidos do próprio aluno autenticado. */
export async function listPedidosAluno(
  alunoId: string,
): Promise<CursoPedidoRow[]> {
  const sql = getSql();
  return sql<CursoPedidoRow[]>`
    SELECT
      p.id::text                            AS id,
      p.aluno_id::text                      AS aluno_id,
      p.curso_id::text                      AS curso_id,
      p.status                              AS status,
      p.criado_em::text                     AS criado_em,
      p.decisao_em::text                    AS decisao_em,
      p.decisao_por::text                   AS decisao_por,
      p.motivo                              AS motivo,
      c.nome                                AS curso_nome,
      c.image_key                           AS curso_image_key
    FROM public.proeduka_curso_pedidos p
    LEFT JOIN public.proeduka_cursos c ON c.id = p.curso_id
    WHERE p.aluno_id = ${alunoId}::uuid
    ORDER BY p.criado_em DESC
  `;
}

/** Devolve o pedido ativo do aluno para um curso (pendente ou iniciado). */
export async function getPedidoAtivo(
  alunoId: string,
  cursoId: string,
): Promise<CursoPedidoRow | null> {
  const sql = getSql();
  const rows = await sql<CursoPedidoRow[]>`
    SELECT
      p.id::text                            AS id,
      p.aluno_id::text                      AS aluno_id,
      p.curso_id::text                      AS curso_id,
      p.status                              AS status,
      p.criado_em::text                     AS criado_em,
      p.decisao_em::text                    AS decisao_em,
      p.decisao_por::text                   AS decisao_por,
      p.motivo                              AS motivo
    FROM public.proeduka_curso_pedidos p
    WHERE p.aluno_id = ${alunoId}::uuid
      AND p.curso_id = ${cursoId}::uuid
      AND p.status IN ('pendente', 'iniciado')
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Cria um pedido novo (idempotente: se já existir um pedido ativo
 * para o mesmo aluno/curso, devolve o existente).
 */
export async function criarPedido(params: {
  alunoId: string;
  cursoId: string;
}): Promise<CursoPedidoRow> {
  const sql = getSql();
  await sql`
    INSERT INTO public.proeduka_curso_pedidos
      (aluno_id, curso_id, status)
    VALUES
      (${params.alunoId}::uuid, ${params.cursoId}::uuid, 'pendente')
    ON CONFLICT ON CONSTRAINT proeduka_curso_pedidos_unique_active
      DO NOTHING
  `;
  const pedido = await getPedidoAtivo(params.alunoId, params.cursoId);
  if (!pedido) {
    throw new Error("Falha ao criar o pedido.");
  }
  return pedido;
}

/** Recusa um pedido ("Não iniciar"). */
export async function recusarPedido(params: {
  pedidoId: string;
  decididoPor: string;
  motivo?: string | null;
}): Promise<CursoPedidoRow> {
  const sql = getSql();
  const rows = await sql<CursoPedidoRow[]>`
    UPDATE public.proeduka_curso_pedidos
    SET
      status = 'recusado',
      decisao_em = now(),
      decisao_por = ${params.decididoPor}::uuid,
      motivo = ${params.motivo ?? null}
    WHERE id = ${params.pedidoId}::uuid
    RETURNING
      id::text                  AS id,
      aluno_id::text            AS aluno_id,
      curso_id::text            AS curso_id,
      status                    AS status,
      criado_em::text           AS criado_em,
      decisao_em::text          AS decisao_em,
      decisao_por::text         AS decisao_por,
      motivo                    AS motivo
  `;
  if (!rows[0]) throw new Error("Pedido não encontrado.");
  return rows[0];
}