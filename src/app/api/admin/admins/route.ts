import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/api/staff-session";
import { createAdminMasterResponse } from "@/lib/api/admin-create-service";
import { getSql } from "@/lib/db/client";

type Body = {
  email?: string;
  password?: string;
  full_name?: string;
  as_master?: boolean;
};

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (session.role !== "master") {
    return NextResponse.json(
      { error: "Apenas o master pode criar administradores." },
      { status: 403 },
    );
  }

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
