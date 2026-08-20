import {
  collectDistinctOptions,
  type AlunosFilterOptions,
} from "@/lib/admin/alunos-list-filters";
import type { Sql } from "@/lib/db/client";

/**
 * Distinct por coluna — evita ler 8000 linhas completas só para combos de filtro.
 */
export async function fetchAlunosListFilterMeta(
  sql: Sql,
  fq: string,
): Promise<{ filterOptions: AlunosFilterOptions; hasEmptyFormPag: boolean }> {
  try {
    const [
      uni,
      crs,
      fpg,
      emptyCheck,
    ] = await Promise.all([
      sql.unsafe<Array<{ v: string | null }>>(
        `
        SELECT DISTINCT trim(both from unidade::text) AS v
        FROM ${fq}
        WHERE unidade IS NOT NULL AND trim(both from unidade::text) <> ''
        `,
        [],
      ),
      sql.unsafe<Array<{ v: string | null }>>(
        `
        SELECT DISTINCT trim(both from curso::text) AS v
        FROM ${fq}
        WHERE curso IS NOT NULL AND trim(both from curso::text) <> ''
        `,
        [],
      ),
      sql.unsafe<Array<{ v: string | null }>>(
        `
        SELECT DISTINCT trim(both from form_pag::text) AS v
        FROM ${fq}
        WHERE form_pag IS NOT NULL AND trim(both from form_pag::text) <> ''
        `,
        [],
      ),
      sql.unsafe<Array<{ ok: boolean }>>(
        `
        SELECT EXISTS (
          SELECT 1 FROM ${fq}
          WHERE form_pag IS NULL OR trim(both from form_pag::text) = ''
        ) AS ok
        `,
        [],
      ),
    ]);

    const rowsForCollect: Record<string, unknown>[] = [
      ...uni.map((r) => ({ unidade: r.v ?? "" })),
      ...crs.map((r) => ({ curso: r.v ?? "" })),
      ...fpg.map((r) => ({ form_pag: r.v ?? "" })),
    ];

    return {
      filterOptions: collectDistinctOptions(rowsForCollect),
      hasEmptyFormPag: Boolean(emptyCheck[0]?.ok),
    };
  } catch {
    return {
      filterOptions: { unidades: [], cursos: [], formPags: [] },
      hasEmptyFormPag: false,
    };
  }
}
