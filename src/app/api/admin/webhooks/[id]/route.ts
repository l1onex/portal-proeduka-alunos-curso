import { NextResponse } from "next/server";
import { requireMasterSession } from "@/lib/api/require-master";
import { getSql } from "@/lib/db/client";
import {
  WEBHOOK_EVENT,
  type WebhookEventType,
} from "@/lib/webhooks/events";

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

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: { url?: unknown; events?: unknown; enabled?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
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

  const existingRows = await sql<Record<string, unknown>[]>`
    SELECT * FROM public.webhook_endpoints
    WHERE id::uuid = ${id}::uuid
    LIMIT 1
  `;
  const ex = existingRows[0];

  if (!ex) {
    return NextResponse.json({ error: "Webhook não encontrado." }, { status: 404 });
  }

  let url =
    typeof ex.url === "string"
      ? ex.url
      : "";
  let eventsVal = Array.isArray(ex.events)
    ? [...(ex.events as string[])] as WebhookEventType[]
    : ([] as WebhookEventType[]);
  let enabled = ex.enabled === true;

  if (typeof body.url === "string") {
    const nu = body.url.trim();
    if (!nu || !isValidUrl(nu)) {
      return NextResponse.json(
        { error: "URL inválida." },
        { status: 400 },
      );
    }
    url = nu;
  }

  if (body.events !== undefined) {
    const next = normalizeEvents(body.events);
    if (!next?.length) {
      return NextResponse.json(
        { error: "Selecione ao menos um evento." },
        { status: 400 },
      );
    }
    eventsVal = next;
  }

  if (typeof body.enabled === "boolean") {
    enabled = body.enabled;
  }

  let data;
  try {
    const rows = await sql<Record<string, unknown>[]>`
      UPDATE public.webhook_endpoints
      SET url = ${url}, events = ${eventsVal}::text[], enabled = ${enabled}, updated_at = now()
      WHERE id::uuid = ${id}::uuid
      RETURNING id::text AS id, url, events, enabled, created_at, updated_at
    `;
    data = rows[0];
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Webhook não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ webhook: data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
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
    await sql`DELETE FROM public.webhook_endpoints WHERE id::uuid = ${id}::uuid`;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao apagar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
