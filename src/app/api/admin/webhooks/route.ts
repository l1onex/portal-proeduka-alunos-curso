import { NextResponse } from "next/server";
import { requireMasterSession } from "@/lib/api/require-master";
import { getSql } from "@/lib/db/client";
import {
  WEBHOOK_EVENT,
  type WebhookEventType,
} from "@/lib/webhooks/events";

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeEvents(raw: unknown): WebhookEventType[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<string>(Object.values(WEBHOOK_EVENT));
  const out: WebhookEventType[] = [];
  for (const x of raw) {
    if (typeof x === "string" && allowed.has(x)) {
      out.push(x as WebhookEventType);
    }
  }
  return [...new Set(out)];
}

export async function GET() {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
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

  const data = await sql`
    SELECT id::text AS id, url, events, enabled, created_at, updated_at
    FROM public.webhook_endpoints
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(request: Request) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { url?: unknown; events?: unknown; enabled?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !isValidUrl(url)) {
    return NextResponse.json(
      { error: "Informe uma URL http(s) válida." },
      { status: 400 },
    );
  }

  const events = normalizeEvents(body.events);
  if (!events?.length) {
    return NextResponse.json(
      { error: "Selecione ao menos um evento." },
      { status: 400 },
    );
  }

  const enabled =
    typeof body.enabled === "boolean" ? body.enabled : true;

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      { error: "Configure DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  let data;
  try {
    const rows = await sql<Record<string, unknown>[]>`
      INSERT INTO public.webhook_endpoints (url, events, enabled)
      VALUES (${url}, ${events}::text[], ${enabled})
      RETURNING id::text AS id, url, events, enabled, created_at, updated_at
    `;
    data = rows[0];
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar webhook." },
      { status: 500 },
    );
  }

  return NextResponse.json({ webhook: data });
}
