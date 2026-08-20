import { NextResponse } from "next/server";
import { requireMasterSession } from "@/lib/api/require-master";
import { getSql } from "@/lib/db/client";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Props) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  try {
    await sql`DELETE FROM public.api_keys WHERE id::uuid = ${id}::uuid`;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao apagar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Props) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: { enabled?: unknown };
  try {
    body = (await request.json()) as { enabled?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Informe enabled: true ou false." },
      { status: 400 },
    );
  }

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  try {
    await sql`
      UPDATE public.api_keys SET enabled = ${body.enabled}
      WHERE id::uuid = ${id}::uuid
    `;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
