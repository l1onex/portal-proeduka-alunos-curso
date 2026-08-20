import { NextResponse } from "next/server";
import { createAdminMasterResponse } from "@/lib/api/admin-create-service";
import { requireApiKey } from "@/lib/api/verify-api-key";
import { getSql } from "@/lib/db/client";

type Body = {
  email?: string;
  password?: string;
  full_name?: string;
  as_master?: boolean;
};

export async function POST(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  let sql;
  try {
    sql = getSql();
  } catch {
    return NextResponse.json(
      {
        error: "Configure DATABASE_URL no servidor para criar utilizadores.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  return createAdminMasterResponse(sql, body);
}
