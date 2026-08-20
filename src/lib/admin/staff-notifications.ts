import type { Sql } from "@/lib/db/client";

export const STAFF_NOTIFICATIONS_TABLE = "proeduka_staff_notifications" as const;

export type StaffNotificationRow = {
  id: string;
  created_at: string;
  kind: string;
  student_id: string | null;
  student_name: string | null;
  body: string;
  metadata: Record<string, unknown>;
};

export async function insertCertificadoSolicitadoNotification(
  sql: Sql,
  opts: { studentId: string; studentName: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = `${opts.studentName} solicitou o certificado.`;
  try {
    await sql`
      INSERT INTO public.proeduka_staff_notifications
        (kind, student_id, student_name, body, metadata)
      VALUES (
        'certificado_solicitado',
        ${opts.studentId}::uuid,
        ${opts.studentName},
        ${body},
        '{}'::jsonb
      )
    `;
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Falha ao criar notificação.";
    return { ok: false, error: msg };
  }
}

/** Notificação genérica para a campaninha (admin). */
export async function insertStaffNotification(
  sql: Sql,
  opts: {
    kind: string;
    studentId?: string | null;
    studentName?: string | null;
    body: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const metadata = opts.metadata ?? {};
  try {
    await sql`
      INSERT INTO public.proeduka_staff_notifications
        (kind, student_id, student_name, body, metadata)
      VALUES (
        ${opts.kind},
        ${opts.studentId ?? null}::uuid,
        ${opts.studentName ?? null},
        ${opts.body},
        ${JSON.stringify(metadata)}::jsonb
      )
    `;
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Falha ao criar notificação.";
    return { ok: false, error: msg };
  }
}

export async function listStaffNotifications(
  sql: Sql,
  limit = 50,
): Promise<
  { ok: true; rows: StaffNotificationRow[] } | { ok: false; error: string }
> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 50, 1), 500);
  try {
    const rows = await sql<StaffNotificationRow[]>`
      SELECT id::text AS id,
             created_at::text AS created_at,
             kind::text AS kind,
             student_id::text AS student_id,
             student_name::text AS student_name,
             body::text AS body,
             metadata AS metadata
      FROM public.proeduka_staff_notifications
      ORDER BY created_at DESC NULLS LAST
      LIMIT ${safeLimit}
    `;
    return { ok: true, rows: rows ?? [] };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Erro ao listar notificações.",
    };
  }
}

export async function deleteStaffNotification(
  sql: Sql,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const out =
      await sql<{ id?: string | null }[]>`
      DELETE FROM public.proeduka_staff_notifications
      WHERE id::text = ${id.trim()}
      RETURNING id::text
    `;
    if (!out?.length || !out[0]?.id) {
      return { ok: false, error: "Aviso não encontrado." };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao apagar.",
    };
  }
}
