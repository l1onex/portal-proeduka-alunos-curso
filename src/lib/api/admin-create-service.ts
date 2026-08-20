import { NextResponse } from "next/server";

import {
  deleteAuthUserCascade,
  findAuthUserIdByEmail,
  insertAuthUserReturningId,
} from "@/lib/auth/auth-users-db";
import type { Sql } from "@/lib/db/client";
import { isPgUndefinedFunction } from "@/lib/db/pg-error";
import { profileNameColumn } from "@/lib/profiles-name-column";

type Body = {
  email?: string;
  password?: string;
  full_name?: string;
  /** Se true, perfil com papel master; se false/omitido, administrador comum. */
  as_master?: boolean;
};

async function upsertStaffProfileUnsafe(
  sql: Sql,
  userId: string,
  email: string,
  profileRole: "admin" | "master",
  fullName: string,
): Promise<{ error?: string }> {
  const col = profileNameColumn();
  if (col !== "full_name" && col !== "nome") {
    return {
      error: "PROFILES_NAME_COLUMN inválida (use full_name ou nome).",
    };
  }

  const useNomeColumn = col === "nome";

  try {
    await sql`
      SELECT public.upsert_staff_profile_by_id(
        ${userId}::uuid,
        ${email},
        ${profileRole},
        ${fullName},
        ${useNomeColumn}
      )
    `;
    return {};
  } catch (e) {
    if (!isPgUndefinedFunction(e)) {
      return {
        error: e instanceof Error ? e.message : "Falha ao gravar perfil.",
      };
    }
  }

  const q = `
INSERT INTO public.profiles (id, email, role, "${col}", created_at, updated_at)
VALUES ($1::uuid, $2::text, $3::text, $4::text, now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  "${col}" = EXCLUDED."${col}",
  updated_at = now()
`;

  try {
    await sql.unsafe(q, [userId, email, profileRole, fullName]);
    return {};
  } catch (e2) {
    return {
      error: e2 instanceof Error ? e2.message : "Falha ao gravar perfil.",
    };
  }
}

export async function createAdminMasterResponse(
  sql: Sql,
  body: Body,
): Promise<NextResponse> {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName =
    typeof body.full_name === "string" ? body.full_name.trim() : "";
  const asMaster = body.as_master === true;
  const profileRole = asMaster ? "master" : "admin";

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Informe e-mail, senha e nome completo." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }

  let createdNew = false;
  let userId: string | null = null;

  const inserted = await insertAuthUserReturningId(sql, { email, password });
  if ("id" in inserted) {
    createdNew = true;
    userId = inserted.id;
  } else if (inserted.error === "email_duplicate") {
    userId = await findAuthUserIdByEmail(sql, email);
    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Este e-mail já está registado, mas não foi possível resolver o ID do utilizador.",
        },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json(
      { error: inserted.error ?? "Falha ao criar utilizador no Auth." },
      { status: 400 },
    );
  }

  const prof = await upsertStaffProfileUnsafe(
    sql,
    userId,
    email.trim().toLowerCase(),
    profileRole,
    fullName,
  );

  if (prof.error) {
    if (createdNew && userId) {
      await deleteAuthUserCascade(sql, userId);
    }
    return NextResponse.json({ error: prof.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: userId });
}
