import { NextResponse } from "next/server";
import { lookupCertificateByCode } from "@/lib/certificate/lookup";

/** GET /api/public/validar?c=CÓDIGO — JSON para integrações (sem autenticação). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const c = url.searchParams.get("c")?.trim() ?? "";
  if (!c) {
    return NextResponse.json(
      { ok: false, status: "invalid" as const },
      { status: 400 },
    );
  }

  const result = await lookupCertificateByCode(c);

  if (result.status === "invalid") {
    return NextResponse.json({ ok: false, status: "invalid" as const });
  }
  if (result.status === "suspended_pending") {
    return NextResponse.json({
      ok: true,
      status: "suspended_pending" as const,
      nome: result.nome,
      cpf_mascarado: result.cpf_mascarado,
    });
  }
  if (result.status === "not_approved") {
    return NextResponse.json({
      ok: true,
      status: "not_approved" as const,
      nome: result.nome,
      cpf_mascarado: result.cpf_mascarado,
    });
  }
  return NextResponse.json({
    ok: true,
    status: "valid" as const,
    nome: result.nome,
    numero_registro: result.numero_registro,
    cpf_mascarado: result.cpf_mascarado,
  });
}
