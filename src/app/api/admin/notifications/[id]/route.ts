import { NextResponse } from "next/server";
import { deleteStaffNotification } from "@/lib/admin/staff-notifications";
import { getStaffSession } from "@/lib/api/staff-session";
import { getSql } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff: remove um aviso (marcar como visto / dispensar). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  const res = await deleteStaffNotification(service, id.trim());
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
