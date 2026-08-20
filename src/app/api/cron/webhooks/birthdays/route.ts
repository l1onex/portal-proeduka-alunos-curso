import { NextResponse } from "next/server";
import { runBirthdayWebhooksForToday } from "@/lib/webhooks/dispatch";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Disparo manual ou por agendador externo: mesmo fluxo que o cron interno em
 * produção (`instrumentation.ts`, fuso America/Sao_Paulo). Compara `dt_nasc`
 * com o dia/mês de hoje e dispara o webhook `birthday`.
 *
 * Proteção: header Authorization: Bearer <CRON_SECRET>
 * ou query ?secret= (apenas em desenvolvimento).
 */
export async function GET(request: Request) {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.CRON_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Defina CRON_SECRET (ou CRON_WEBHOOK_SECRET) no ambiente para o cron de aniversários.",
      },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const url = new URL(request.url);
  const q = url.searchParams.get("secret");

  const ok =
    bearer === secret ||
    (process.env.NODE_ENV === "development" && q === secret);

  if (!ok) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const result = await runBirthdayWebhooksForToday();
  return NextResponse.json({
    ok: true,
    sent: result.sent,
    errors: result.errors,
  });
}
