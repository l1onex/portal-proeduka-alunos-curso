import { NextResponse } from "next/server";
import { requireMasterSession } from "@/lib/api/require-master";
import { generateApiKeyPair } from "@/lib/api/api-key-crypto";
import { getSql } from "@/lib/db/client";

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
    SELECT id::text AS id, name, key_prefix, enabled, created_at, last_used_at
    FROM public.api_keys
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(request: Request) {
  const master = await requireMasterSession();
  if (!master) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { name?: unknown };
  try {
    body = (await request.json()) as { name?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Informe um nome para a chave." }, { status: 400 });
  }

  const { secret, keyHash, keyPrefix } = generateApiKeyPair();

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
    const rows = await sql`
      INSERT INTO public.api_keys (name, key_hash, key_prefix, enabled)
      VALUES (${name}, ${keyHash}, ${keyPrefix}, true)
      RETURNING id::text AS id, name, key_prefix, created_at
    `;
    data = rows[0];
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Falha ao criar chave.",
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Falha ao criar chave." }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    key: secret,
    warning:
      "Guarde esta chave agora. Ela não será mostrada de novo (apenas o prefixo fica visível).",
  });
}
