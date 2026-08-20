import type { Sql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";
import {
  isPgUndefinedFunction,
  isPgUndefinedRelation,
} from "@/lib/db/pg-error";

const MIN_MAT_SEQUENCE = BigInt("2026210093");
/** Dois ints para advisory lock estável nas versões Postgres sem BIGINT lock. */
const MATR_LOCK_SLOT_A = 1_827_364_519;
const MATR_LOCK_SLOT_B = 917_026_843;

function packOk(raw: unknown):
  | { ok: true; value: string }
  | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
    return { ok: false, error: "Não foi possível obter o número da matrícula." };
  }
  const s = typeof raw === "string" ? raw : String(raw);
  const t = s.trim();
  if (!t) {
    return { ok: false, error: "Número da matrícula inválido." };
  }
  return { ok: true, value: t };
}

function errPack(e: unknown): { ok: false; error: string } {
  const msg =
    e instanceof Error
      ? e.message
      : "Não foi possível obter o número da matrícula.";
  return { ok: false, error: msg };
}

/**
 * Quando nem a RPC nem `nextval` existem na BD — MAX(números válidos)+1 dentro de uma
 * transacção com advisory lock (concorrência limitada aos cadastros simultâneos).
 */
async function fetchNextMatriculaTransactionalMax(sql: Sql): Promise<
  | { ok: true; value: string }
  | { ok: false; error: string }
> {
  const fq = alunosFqn();
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe(
        `SELECT pg_advisory_xact_lock($1::int, $2::int)`,
        [MATR_LOCK_SLOT_A, MATR_LOCK_SLOT_B],
      );
      const mxRows = await tx.unsafe<Array<{ mx: string | bigint | null }>>(`
          SELECT COALESCE(
            MAX(
              CASE
                WHEN numero_matricula IS NOT NULL
                  AND length(trim(both from numero_matricula::text)) >= 10
                  AND trim(both from numero_matricula::text) ~ '^[0-9]+$'
                  AND (trim(both from numero_matricula::text))::bigint >= 2026000000
                THEN (trim(both from numero_matricula::text))::bigint
              END
            ),
            2026210092::bigint
          )::bigint AS mx
          FROM ${fq}
        `);

      const base = mxRows?.[0]?.mx;
      const bi =
        typeof base === "bigint"
          ? base
          : BigInt(typeof base === "string" ? base : "2026210092");

      /** Próximo = max + 1, nunca abaixo do mínimo agendado pela sequência migrações. */
      const bumped = bi + BigInt("1");
      const next =
        bumped < MIN_MAT_SEQUENCE ? MIN_MAT_SEQUENCE : bumped;
      return packOk(next.toString());
    });
  } catch (e) {
    return errPack(e);
  }
}

/**
 * Próximo número de matrícula: tenta RPC `next_numero_matricula`, depois `nextval` na sequência,
 * depois MAX+1 transaccional — para ambientes onde a migração 017/024 não correu ou grants falham.
 */
export async function fetchNextNumeroMatricula(
  service: Sql,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  try {
    const rows =
      await service<Array<{ next_numero_matricula?: string | null }>>`
        SELECT public.next_numero_matricula() AS next_numero_matricula
      `;
    return packOk(rows[0]?.next_numero_matricula);
  } catch (e) {
    if (!isPgUndefinedFunction(e)) {
      return errPack(e);
    }
  }

  try {
    const seqRows =
      await service<Array<{ v?: string | null }>>`
        SELECT nextval('public.proeduka_numero_matricula_seq'::regclass)::text AS v
      `;
    return packOk(seqRows[0]?.v);
  } catch (e2) {
    if (!isPgUndefinedRelation(e2) && !isPgUndefinedFunction(e2)) {
      return errPack(e2);
    }
  }

  return fetchNextMatriculaTransactionalMax(service);
}
