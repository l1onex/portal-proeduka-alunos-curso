import { profileDisplayName } from "@/lib/profile-display-name";
import { getSql } from "@/lib/db/client";
import { isPgUndefinedFunction } from "@/lib/db/pg-error";

export type AdminListRow = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  role: "admin" | "master";
};

async function fetchStaffProfiles(
  sql: ReturnType<typeof getSql>,
): Promise<Record<string, unknown>[]> {
  try {
    return await sql<
      Record<string, unknown>[]
    >`SELECT * FROM public.list_staff_profiles_for_admin_ui()`;
  } catch (e) {
    if (!isPgUndefinedFunction(e)) throw e;
    return await sql<Record<string, unknown>[]>`
      SELECT * FROM public.profiles
      WHERE role IN ('master', 'admin')
      ORDER BY created_at DESC NULLS LAST
    `;
  }
}

export async function loadAdminsWithEmails(): Promise<{
  admins: AdminListRow[];
  error: string | null;
}> {
  let sql;
  try {
    sql = getSql();
  } catch {
    return {
      admins: [],
      error:
        "Defina DATABASE_URL no ambiente (.env/stack) para listar administradores.",
    };
  }

  let profiles: Record<string, unknown>[];
  try {
    profiles = await fetchStaffProfiles(sql);
  } catch (e) {
    console.error("[loadAdminsWithEmails]", e);
    return {
      admins: [],
      error: e instanceof Error ? e.message : "Erro ao listar equipa administrativa.",
    };
  }

  const ids = profiles
    .map((p) => String(p.id ?? "").trim())
    .filter(Boolean);

  const emailById = new Map<string, string>();
  if (ids.length > 0) {
    const users = await sql<Array<{ id: string; email: string | null }>>`
      SELECT id::text AS id, email FROM auth.users
      WHERE id IN ${sql(ids)}
    `;
    for (const u of users) {
      if (typeof u.id === "string" && u.id) {
        emailById.set(u.id, typeof u.email === "string" ? u.email : "");
      }
    }
  }

  const admins = profiles
    .map((p) => {
      const row = p as Record<string, unknown>;
      const r = String(row.role ?? "").trim().toLowerCase();
      if (r !== "master" && r !== "admin") return null;
      const role: "admin" | "master" = r === "master" ? "master" : "admin";
      const id = String(row.id ?? "");
      return {
        id,
        full_name: profileDisplayName(row),
        email: emailById.get(id) ?? "—",
        created_at: String(row.created_at ?? ""),
        role,
      };
    })
    .filter((x): x is AdminListRow => x !== null);

  return { admins, error: null };
}
