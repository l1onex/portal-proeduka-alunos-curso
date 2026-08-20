import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";
import { parseStudentIdFromObjectKey } from "@/lib/b2/object-keys";
import {
  buildCertificatePrintPayload,
  buildCertificateRequestedPayload,
} from "@/lib/webhooks/certificate-payload";
import type { CursoRow } from "@/lib/api/cursos";
import {
  WEBHOOK_EVENT,
  type WebhookCursoSnapshot,
  type WebhookEventType,
  type WebhookPayload,
} from "@/lib/webhooks/events";
import { getPresignedGetUrlServer } from "@/lib/webhooks/b2-presign-get-server";
import { isBirthdayTodayInBrazil, todayDateStringBrazil } from "@/lib/webhooks/birthday-check";

type Row = {
  id: string;
  url: string;
  events: string[] | null;
  enabled: boolean | null;
};

export async function loadEnabledEndpointsForEvent(
  event: WebhookEventType,
): Promise<Row[]> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return [];
  }

  const data = await sql<Row[]>`
    SELECT id::text AS id, url, events, enabled
    FROM public.webhook_endpoints
    WHERE enabled = true
  `;

  return data.filter(
    (r) => Array.isArray(r.events) && r.events.includes(event),
  );
}

export async function postToUrl(url: string, payload: WebhookPayload): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Proeduka-Webhooks/1.0",
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(
        `[webhook] ${url} → HTTP ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } finally {
    clearTimeout(t);
  }
}

async function fetchAlunoFullRow(
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

/** Dispara webhooks `data_updated` para um aluno; opcionalmente com URL do arquivo no B2. */
export async function dispatchDataUpdatedWebhook(params: {
  studentId: string;
  name: string;
  email: string;
  fileKey?: string | null;
  /** Nome amigável para automações (documento, foto, dados cadastrais). */
  label?: string | null;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(WEBHOOK_EVENT.DATA_UPDATED);
  if (!endpoints.length) return;

  let fileUrl: string | undefined;
  if (params.fileKey?.trim()) {
    const sid = parseStudentIdFromObjectKey(params.fileKey.trim());
    if (sid === params.studentId.toLowerCase()) {
      const u = await getPresignedGetUrlServer(params.fileKey.trim());
      if (u) fileUrl = u;
    }
  }

  const payload: WebhookPayload = {
    event: WEBHOOK_EVENT.DATA_UPDATED,
    student: { name: params.name, email: params.email },
    ...(params.label?.trim() ? { label: params.label.trim() } : {}),
    ...(fileUrl ? { fileUrl } : {}),
  };

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

/** Dispara webhooks `inadimplente` quando o admin marca o aluno como inadimplente. */
export async function dispatchInadimplenteWebhook(params: {
  studentId: string;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(
    WEBHOOK_EVENT.INADIMPLENTE,
  );
  if (!endpoints.length) return;

  const row = await fetchAlunoFullRow(params.studentId);
  if (!row) return;

  const payload: WebhookPayload = {
    event: WEBHOOK_EVENT.INADIMPLENTE,
    student: row,
    marked_at: new Date().toISOString(),
  };

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

/** Dispara webhooks `certificate_print` após “Iniciar certificado” (admin). */
export async function dispatchCertificatePrintWebhook(params: {
  studentId: string;
  /** Quando o pedido for por curso, passe o id para incluir o snapshot do curso no payload. */
  cursoId?: string | null;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(
    WEBHOOK_EVENT.CERTIFICATE_PRINT,
  );
  if (!endpoints.length) return;

  const [row, curso] = await Promise.all([
    fetchAlunoFullRow(params.studentId),
    params.cursoId?.trim() ? fetchCursoRow(params.cursoId.trim()) : null,
  ]);
  if (!row) return;

  const payload: WebhookPayload = buildCertificatePrintPayload(row, {
    curso,
  });

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

/** Dispara webhooks `certificate_requested` após o aluno solicitar o certificado no portal. */
export async function dispatchCertificateRequestedWebhook(params: {
  studentId: string;
  requestedAtIso: string;
  /** Quando o pedido for por curso, passe o id para incluir o snapshot do curso no payload. */
  cursoId?: string | null;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(
    WEBHOOK_EVENT.CERTIFICATE_REQUESTED,
  );
  if (!endpoints.length) return;

  const [row, curso] = await Promise.all([
    fetchAlunoFullRow(params.studentId),
    params.cursoId?.trim() ? fetchCursoRow(params.cursoId.trim()) : null,
  ]);
  if (!row) return;

  const payload: WebhookPayload = buildCertificateRequestedPayload(
    row,
    params.requestedAtIso,
    { curso },
  );

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

async function fetchCursoRow(
  cursoId: string,
): Promise<CursoRow | null> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return null;
  }
  try {
    const rows = await sql<CursoRow[]>`
      SELECT id::text             AS id,
             nome                 AS nome,
             descricao            AS descricao,
             image_key            AS image_key,
             criado_em::text      AS criado_em,
             criado_por::text     AS criado_por,
             atualizado_em::text  AS atualizado_em
      FROM public.proeduka_cursos
      WHERE id = ${cursoId}::uuid
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Lê um curso e devolve o snapshot usado em payloads de webhook
 *  (inclui apenas os campos públicos relevantes). */
export async function buildCursoSnapshot(
  cursoId: string,
): Promise<WebhookCursoSnapshot | null> {
  const c = await fetchCursoRow(cursoId);
  if (!c) return null;
  return {
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    image_key: c.image_key,
    criado_em: c.criado_em,
  };
}

/** Dispara webhooks `birthday` para um aluno (cron). */
export async function dispatchBirthdayWebhook(params: {
  name: string;
  email: string;
}): Promise<void> {
  const endpoints = await loadEnabledEndpointsForEvent(WEBHOOK_EVENT.BIRTHDAY);
  if (!endpoints.length) return;

  const payload: WebhookPayload = {
    event: WEBHOOK_EVENT.BIRTHDAY,
    student: { name: params.name, email: params.email },
    date: todayDateStringBrazil(),
  };

  await Promise.allSettled(
    endpoints.map((e) => postToUrl(e.url, payload)),
  );
}

/** Usado pelo cron: lista alunos com aniversário hoje e dispara um webhook por aluno. */
export async function runBirthdayWebhooksForToday(): Promise<{
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;

  let sql;
  try {
    sql = getSql();
  } catch (e) {
    return {
      sent: 0,
      errors: [e instanceof Error ? e.message : "Ligação Postgres indisponível."],
    };
  }

  const fq = alunosFqn();
  let rows: Array<{ nome?: unknown; email?: unknown; dt_nasc?: unknown }>;
  try {
    rows = await sql.unsafe(
      `SELECT nome, email, dt_nasc FROM ${fq}`,
      [],
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro na consulta de alunos.";
    return { sent: 0, errors: [msg] };
  }

  for (const row of rows ?? []) {
    const dt = row.dt_nasc;
    if (!isBirthdayTodayInBrazil(dt)) continue;

    const nome = String(row.nome ?? "").trim();
    const email = String(row.email ?? "").trim();
    if (!email) continue;

    try {
      await dispatchBirthdayWebhook({
        name: nome || email,
        email,
      });
      sent += 1;
    } catch (e) {
      errors.push(
        `${email}: ${e instanceof Error ? e.message : "erro"}`,
      );
    }
  }

  return { sent, errors };
}
