import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { listPedidosAdmin } from "@/lib/api/curso-pedidos";

/** GET /api/admin/curso-pedidos/listar — refresca a lista no cliente. */
export async function GET() {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const pedidos = await listPedidosAdmin();
    return NextResponse.json({ ok: true, pedidos });
  } catch (e) {
    console.error("[admin curso-pedidos/listar GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar pedidos." },
      { status: 500 },
    );
  }
}