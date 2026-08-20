import { redirect } from "next/navigation";

import { getStudentSession } from "@/lib/api/student-session";
import { getSql } from "@/lib/db/client";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";
import { AlunoCatalogoCursosClient } from "@/components/aluno/aluno-catalogo-cursos-client";

export const dynamic = "force-dynamic";

type CursoItem = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
  image_url: string | null;
  estado: "atribuido" | "pendente" | "recusado" | "disponivel";
  status: string | null;
  motivo: string | null;
};

export default async function AlunoCursosPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login?next=/aluno/cursos");

  let cursos: CursoItem[] = [];
  let loadError: string | null = null;
  try {
    const sql = getSql();
    const rows = await sql<
      Array<{
        id: string;
        nome: string;
        descricao: string | null;
        image_key: string | null;
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
    cursos = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        nome: r.nome,
        descricao: r.descricao,
        image_key: r.image_key,
        image_url: await getSignedStorageUrl(r.image_key),
        estado: r.estado,
        status: r.status,
        motivo: r.motivo,
      })),
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <AlunoCatalogoCursosClient
      studentId={session.studentId}
      cursos={cursos}
      loadError={loadError}
    />
  );
}