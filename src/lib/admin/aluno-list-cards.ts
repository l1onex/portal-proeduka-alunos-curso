import { computeCompletedAgeYearsFromDtNasc } from "@/lib/format-br";
import { alunoCardStatus, isTruthyFlag } from "@/lib/aluno-tabela";
import type { StudentCardData } from "@/components/admin/students-grid";
import { getStudentAvatarPresignedUrl } from "@/lib/b2/student-avatar-presign";

const FOTO_3x4_DOC = "Foto estilo 3x4" as const;

type Row = Record<string, unknown> & {
  id: string;
  nome?: string | null;
  dt_nasc?: string | null;
  email?: string | null;
  curso?: string | null;
  unidade?: string | null;
  form_pag?: string | null;
};

function mapRowToCard(row: Row): StudentCardData {
  const id = String(row.id);
  const paymentLabel =
    typeof row.form_pag === "string" && row.form_pag.trim()
      ? row.form_pag.trim()
      : null;
  return {
    id,
    name: typeof row.nome === "string" && row.nome.trim() ? row.nome : "—",
    idadeAnos: computeCompletedAgeYearsFromDtNasc(row.dt_nasc),
    course: typeof row.curso === "string" ? row.curso : "—",
    unit: typeof row.unidade === "string" ? row.unidade : "—",
    email: typeof row.email === "string" ? row.email : "—",
    status: alunoCardStatus(row),
    paymentLabel,
    avatarUrl: null,
  };
}

/**
 * Lista de cartões na grelha /admin/alunos — gera URLs assinadas (B2) só para quem tem
 * foto 3×4 marcada como enviada (até ~18 chamadas paralelas por página).
 */
export async function buildStudentCardRows(
  list: Row[],
): Promise<StudentCardData[]> {
  const cards = list.map(mapRowToCard);
  await Promise.all(
    cards.map(async (card, i) => {
      const row = list[i];
      if (!row?.id || !isTruthyFlag(row[FOTO_3x4_DOC])) return;
      const url = await getStudentAvatarPresignedUrl(String(row.id));
      card.avatarUrl = url;
    }),
  );
  return cards;
}
