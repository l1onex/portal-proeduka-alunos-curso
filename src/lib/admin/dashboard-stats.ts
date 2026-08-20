import {
  computePendencias,
  getAlunosTableName,
  isCertificadoSolicitado,
  isDesistente,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import { alunosFqn } from "@/lib/db/alunos-table";
import type { Sql } from "@/lib/db/client";
import { getSql } from "@/lib/db/client";

const ANALYZE_LIMIT = 5000;

export type FormPagRow = { label: string; count: number };

export type DashboardStats = {
  totalStudents: number;
  analyzedRows: number;
  completeCount: number;
  /** Sem pendências e com certificado aprovado (`final`). */
  certificadoCount: number;
  /** Sem pendências, sem `final`, não desistente — pedido de certificado feito no portal. */
  emAnaliseCount: number;
  /** Cadastro completo, ainda sem pedido de certificado no portal. */
  aguardandoSolicitacaoCount: number;
  /** Com pendências, certificado ainda não aprovado, não marcado como desistente. */
  emAndamentoCount: number;
  /** Marcados como desistentes (`desistente`) e ainda sem certificado aprovado. */
  desistenteCount: number;
  pendingCount: number;
  completionRate: number;
  newLast7Days: number | null;
  pendingFinalCount: number | null;
  /** Se a coluna final não existir ou der erro na consulta */
  finalMetricAvailable: boolean;
  /** Contagem por `form_pag` (todos os alunos, paginação no servidor). */
  formPagBreakdown: FormPagRow[];
  formPagMetricAvailable: boolean;
  error?: string;
};

function normalizeFormPagLabel(value: unknown): string {
  if (value === null || value === undefined) return "Não informado";
  const s = String(value).trim();
  return s === "" ? "Não informado" : s;
}

async function getFormPagBreakdown(
  sql: Sql,
): Promise<{ ok: boolean; entries: FormPagRow[] }> {
  const counts = new Map<string, number>();
  const pageSize = 1000;
  let offset = 0;
  const fq = alunosFqn();
  for (;;) {
    const data = await sql.unsafe<Array<{ form_pag?: unknown }>>(
      `SELECT form_pag FROM ${fq} ORDER BY id ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    if (!data?.length) break;

    for (const row of data) {
      const label = normalizeFormPagLabel(row.form_pag);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
    if (offset > 500_000) break;
  }

  const entries = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return { ok: true, entries };
}

async function countTotalStudents(
  sql: Sql,
): Promise<{ ok: true; total: number } | { ok: false; msg: string }> {
  const fq = alunosFqn();
  try {
    const rows =
      await sql.unsafe<Array<{ count: string }>>(`SELECT count(*)::text AS count FROM ${fq}`);
    const n = rows[0]?.count != null ? Number(rows[0].count) : 0;
    return { ok: true, total: Number.isFinite(n) ? n : 0 };
  } catch (e) {
    return {
      ok: false,
      msg: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const sql = getSql();
  void getAlunosTableName();

  const counted = await countTotalStudents(sql);
  if (!counted.ok) {
    return emptyStats(counted.msg);
  }
  const total = counted.total;

  const fq = alunosFqn();
  let rows: Record<string, unknown>[] = [];
  let fetchErr: string | undefined;
  try {
    rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${fq} ORDER BY created_at DESC NULLS LAST LIMIT $1`,
      [ANALYZE_LIMIT],
    );
  } catch (e) {
    fetchErr =
      e instanceof Error ? e.message : String(e);
  }

  if (fetchErr) {
    const pf = await countPendingFinal(sql);
    const fp = await getFormPagBreakdown(sql);
    return {
      totalStudents: total,
      analyzedRows: 0,
      completeCount: 0,
      certificadoCount: 0,
      emAnaliseCount: 0,
      aguardandoSolicitacaoCount: 0,
      emAndamentoCount: 0,
      desistenteCount: 0,
      pendingCount: 0,
      completionRate: 0,
      newLast7Days: await countNewLast7Days(sql),
      pendingFinalCount: pf.ok ? pf.count : null,
      finalMetricAvailable: pf.ok,
      formPagBreakdown: fp.entries,
      formPagMetricAvailable: fp.ok,
      error: fetchErr,
    };
  }

  if (!rows?.length) {
    const pf = await countPendingFinal(sql);
    const fp = await getFormPagBreakdown(sql);
    return {
      totalStudents: total,
      analyzedRows: 0,
      completeCount: 0,
      certificadoCount: 0,
      emAnaliseCount: 0,
      aguardandoSolicitacaoCount: 0,
      emAndamentoCount: 0,
      desistenteCount: 0,
      pendingCount: 0,
      completionRate: 0,
      newLast7Days: await countNewLast7Days(sql),
      pendingFinalCount: pf.ok ? pf.count : null,
      finalMetricAvailable: pf.ok,
      formPagBreakdown: fp.entries,
      formPagMetricAvailable: fp.ok,
    };
  }

  let completeCount = 0;
  let certificadoCount = 0;
  let emAnaliseCount = 0;
  let aguardandoSolicitacaoCount = 0;
  let pendingCount = 0;
  let emAndamentoCount = 0;
  let desistenteCount = 0;
  for (const row of rows) {
    const rec = row as Record<string, unknown>;
    const p = computePendencias(rec);
    const certFinal = isTruthyFlag(rec.final);
    if (p.totalCount === 0) {
      completeCount++;
      if (certFinal) certificadoCount++;
      else if (!isDesistente(rec)) {
        if (isCertificadoSolicitado(rec)) emAnaliseCount++;
        else aguardandoSolicitacaoCount++;
      }
    } else pendingCount++;

    if (!certFinal && isDesistente(rec)) {
      desistenteCount++;
    } else if (!certFinal && !isDesistente(rec) && p.totalCount > 0) {
      emAndamentoCount++;
    }
  }

  const analyzed = rows.length;
  const denom = completeCount + pendingCount;
  const completionRate =
    denom > 0 ? Math.round((completeCount / denom) * 1000) / 10 : 0;

  const pf = await countPendingFinal(sql);
  const fp = await getFormPagBreakdown(sql);
  return {
    totalStudents: total,
    analyzedRows: analyzed,
    completeCount,
    certificadoCount,
    emAnaliseCount,
    aguardandoSolicitacaoCount,
    emAndamentoCount,
    desistenteCount,
    pendingCount,
    completionRate,
    newLast7Days: await countNewLast7Days(sql),
    pendingFinalCount: pf.ok ? pf.count : null,
    finalMetricAvailable: pf.ok,
    formPagBreakdown: fp.entries,
    formPagMetricAvailable: fp.ok,
  };
}

async function countNewLast7Days(sql: Sql): Promise<number | null> {
  const fq = alunosFqn();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  try {
    const rows = await sql.unsafe<Array<{ c: number }>>(
      `SELECT count(*)::int AS c FROM ${fq} WHERE created_at >= $1::timestamptz`,
      [sevenDaysAgo.toISOString()],
    );
    return rows[0]?.c ?? 0;
  } catch {
    return null;
  }
}

async function countPendingFinal(
  sql: Sql,
): Promise<{ ok: boolean; count: number }> {
  const fq = alunosFqn();
  try {
    const rows =
      await sql.unsafe<Array<{ c: number }>>(`SELECT count(*)::int AS c FROM ${fq} WHERE final IS NULL`);
    return { ok: true, count: rows[0]?.c ?? 0 };
  } catch {
    return { ok: false, count: 0 };
  }
}

function emptyStats(err: string): DashboardStats {
  return {
    totalStudents: 0,
    analyzedRows: 0,
    completeCount: 0,
    certificadoCount: 0,
    emAnaliseCount: 0,
    aguardandoSolicitacaoCount: 0,
    emAndamentoCount: 0,
    desistenteCount: 0,
    pendingCount: 0,
    completionRate: 0,
    newLast7Days: null,
    pendingFinalCount: null,
    finalMetricAvailable: false,
    formPagBreakdown: [],
    formPagMetricAvailable: false,
    error: err,
  };
}
