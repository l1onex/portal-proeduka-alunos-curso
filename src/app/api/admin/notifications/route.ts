import { NextResponse } from "next/server";
import { listStaffNotifications } from "@/lib/admin/staff-notifications";
import { getStaffSession } from "@/lib/api/staff-session";
import { getSql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff: últimas notificações (sininho do admin). */
export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
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

  const res = await listStaffNotifications(service, 50);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  return NextResponse.json(
    { notifications: res.rows },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
