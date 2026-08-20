import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { getStudentSession } from "@/lib/api/student-session";
import { alunosFqn } from "@/lib/db/alunos-table";
import { getSql } from "@/lib/db/client";
import { WEBHOOK_EVENT } from "@/lib/webhooks/events";
import { dispatchDataUpdatedWebhook } from "@/lib/webhooks/dispatch";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Disparo interno após aluno/admin atualizar dados ou enviar arquivo.
 * Autenticado: aluno (próprio id) ou staff.
 */
export async function POST(request: Request) {
  const student = await getStudentSession();
  const staff = await getStaffSession();
  if (!student && !staff) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: {
    event?: unknown;
    studentId?: unknown;
    fileKey?: unknown;
    label?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const event = body.event;
  if (event !== WEBHOOK_EVENT.DATA_UPDATED) {
    return NextResponse.json(
      { error: "Evento não suportado neste endpoint." },
      { status: 400 },
    );
  }

  const studentId =
    typeof body.studentId === "string" ? body.studentId.trim() : "";
  if (!studentId) {
    return NextResponse.json({ error: "Informe studentId." }, { status: 400 });
  }

  if (student && student.studentId !== studentId) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const fileKey =
    typeof body.fileKey === "string" && body.fileKey.trim()
      ? body.fileKey.trim()
      : null;

  const rawLabel =
    typeof body.label === "string" ? body.label.trim() : "";
  const label =
    rawLabel.length > 200 ? rawLabel.slice(0, 200) : rawLabel || null;

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  const fq = alunosFqn();
  let rows: Array<{ nome?: unknown; email?: unknown }>;
  try {
    rows = await sql.unsafe(
      `SELECT nome, email FROM ${fq} WHERE id::text = $1 LIMIT 1`,
      [studentId],
    );
  } catch {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const row = rows[0];

  if (!row) {
    return NextResponse.json(
      { error: "Aluno não encontrado." },
      { status: 404 },
    );
  }

  const nome = String(row.nome ?? "").trim();
  const email = String(row.email ?? "").trim();
  if (!email) {
    return NextResponse.json(
      { error: "Aluno sem e-mail." },
      { status: 422 },
    );
  }

  try {
    await dispatchDataUpdatedWebhook({
      studentId,
      name: nome || email,
      email,
      fileKey,
      label,
    });
  } catch (e) {
    console.error("[webhooks/dispatch]", e);
  }

  return NextResponse.json({ ok: true });
}
