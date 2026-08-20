import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/api/staff-session";
import { listCursoSolicitacoesAdmin } from "@/lib/api/curso-solicitacoes";

/**
 * GET /api/admin/curso-solicitacoes/listar
 * Query opcional: ?status=pendente|aprovado|recusado
 */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "pendente" ||
      statusParam === "aprovado" ||
      statusParam === "recusado"
        ? statusParam
        : undefined;
    const rows = await listCursoSolicitacoesAdmin(status);
    return NextResponse.json({ ok: true, pedidos: rows });
  } catch (e) {
    console.error("[admin curso-solicitacoes/listar GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro a listar." },
      { status: 500 },
    );
  }
}