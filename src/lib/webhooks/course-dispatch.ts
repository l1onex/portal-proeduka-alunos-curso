/**
 * Disparos de webhook relacionados a cursos (pedidos do aluno + liberação pelo admin).
 */

import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";
import {
  buildCursoSnapshot,
  loadEnabledEndpointsForEvent,
  postToUrl,
} from "@/lib/webhooks/dispatch";
import {
  WEBHOOK_EVENT,
  type WebhookCursoSnapshot,
  type WebhookPayloadCourseApproved,
  type WebhookPayloadCourseRequested,
} from "@/lib/webhooks/events";
import {
  COLUNAS_IGNORADAS_APP,
  COLUNAS_WEBHOOK_IGNORADAS,
} from "@/lib/aluno-tabela";

function stripStudentRowForWebhook(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const student: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (COLUNAS_IGNORADAS_APP.has(k)) continue;
    if (COLUNAS_WEBHOOK_IGNORADAS.has(k)) continue;
    student[k] = v;
  }
  return student;
}

async function fetchAlunoRow(
  studentId: string,
): Promise<Record<string, unknown> | null> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return null;
  }
  const fq = alunosFqn();
  try {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1`,
      [studentId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Dispara webhook `course_requested` quando o aluno pede um curso. */
export async function dispatchCourseRequestedWebhook(params: {
  studentId: string;
  cursoId: string;
  requestedAtIso: string;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(
    WEBHOOK_EVENT.COURSE_REQUESTED,
  );
  if (!endpoints.length) return;

  const [row, curso] = await Promise.all([
    fetchAlunoRow(params.studentId),
    buildCursoSnapshot(params.cursoId),
  ]);
  if (!row || !curso) return;

  const payload: WebhookPayloadCourseRequested = {
    event: WEBHOOK_EVENT.COURSE_REQUESTED,
    student: stripStudentRowForWebhook(row),
    curso,
    requested_at: params.requestedAtIso,
  };

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

/** Dispara webhook `course_approved` quando o admin libera um curso. */
export async function dispatchCourseApprovedWebhook(params: {
  studentId: string;
  cursoId: string;
  approvedAtIso: string;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(
    WEBHOOK_EVENT.COURSE_APPROVED,
  );
  if (!endpoints.length) return;

  const [row, curso] = await Promise.all([
    fetchAlunoRow(params.studentId),
    buildCursoSnapshot(params.cursoId),
  ]);
  if (!row || !curso) return;

  const payload: WebhookPayloadCourseApproved = {
    event: WEBHOOK_EVENT.COURSE_APPROVED,
    student: stripStudentRowForWebhook(row),
    curso,
    approved_at: params.approvedAtIso,
  };

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

/** Mantém a referência ao tipo para que a tree-shake não reclame. */
export type { WebhookCursoSnapshot };