import { NextResponse } from "next/server";

import { getStudentSession } from "@/lib/api/student-session";
import { getSql } from "@/lib/db/client";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";

type CursoDisponivelRow = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
  criado_em: string;
  /** Estado deste curso para o aluno: atribuido | pendente | recusado | disponivel */
  estado: "atribuido" | "pendente" | "recusado" | "disponivel";
  /** Status do curso atribuído (a_cursar / concluido). */
  status: string | null;
  /** Motivo da recusa (se houver). */
  motivo: string | null;
  /** URL pré-assinada para exibir a thumbnail. */
  image_url: string | null;
};

/**
 * GET /api/aluno/cursos-disponiveis
 * Lista TODOS os cursos do sistema + estado para o aluno autenticado
 * (atribuido, pendente, recusado, disponivel).
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const sql = getSql();
    const rows = await sql<
      Array<{
        id: string;
        nome: string;
        descricao: string | null;
        image_key: string | null;
        criado_em: string;
        estado: "atribuido" | "pendente" | "recusado" | "disponivel";
        status: string | null;
        motivo: string | null;
      }>
    >`
      SELECT
        c.id::text              AS id,
        c.nome                  AS nome,
        c.descricao             AS descricao,
        c.image_key             AS image_key,
        c.criado_em::text       AS criado_em,
        CASE
          WHEN ac.id IS NOT NULL THEN 'atribuido'
          WHEN sp.id IS NOT NULL AND sp.status = 'pendente' THEN 'pendente'
          WHEN sr.id IS NOT NULL THEN 'recusado'
          ELSE 'disponivel'
        END                     AS estado,
        ac.status               AS status,
        COALESCE(sr.motivo, NULL) AS motivo
      FROM public.proeduka_cursos c
      LEFT JOIN public.proeduka_aluno_cursos ac
        ON ac.curso_id = c.id AND ac.aluno_id = ${session.studentId}::uuid
      LEFT JOIN public.proeduka_curso_solicitacoes sp
        ON sp.curso_id = c.id AND sp.aluno_id = ${session.studentId}::uuid AND sp.status = 'pendente'
      LEFT JOIN LATERAL (
        SELECT id, motivo FROM public.proeduka_curso_solicitacoes
        WHERE curso_id = c.id AND aluno_id = ${session.studentId}::uuid AND status = 'recusado'
        ORDER BY decisao_em DESC NULLS LAST, criado_em DESC
        LIMIT 1
      ) sr ON true
      ORDER BY c.nome ASC
    `;

    const out: CursoDisponivelRow[] = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        nome: r.nome,
        descricao: r.descricao,
        image_key: r.image_key,
        criado_em: r.criado_em,
        estado: r.estado,
        status: r.status,
        motivo: r.motivo,
        image_url: await getSignedStorageUrl(r.image_key),
      })),
    );

    return NextResponse.json({ ok: true, cursos: out });
  } catch (e) {
    console.error("[aluno cursos-disponiveis GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar cursos." },
      { status: 500 },
    );
  }
}