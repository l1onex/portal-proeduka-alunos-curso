import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { recusarPedido } from "@/lib/api/curso-pedidos";

/** POST /api/admin/curso-pedidos/recusar — body { pedido_id, motivo? } */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const pedidoId = typeof body.pedido_id === "string" ? body.pedido_id.trim() : "";
  if (!pedidoId) {
    return NextResponse.json(
      { error: "Informe o pedido (pedido_id)." },
      { status: 400 },
    );
  }
  const motivo =
    typeof body.motivo === "string" && body.motivo.trim()
      ? body.motivo.trim()
      : null;

  try {
    const row = await recusarPedido({
      pedidoId,
      decididoPor: session.userId,
      motivo,
    });
    return NextResponse.json({ ok: true, pedido: row });
  } catch (e) {
    console.error("[admin curso-pedidos/recusar POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a recusar pedido." },
      { status: 500 },
    );
  }
}