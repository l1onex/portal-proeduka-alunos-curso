import { getStaffSession } from "@/lib/api/staff-session";

export async function requireMasterSession() {
  const session = await getStaffSession();
  if (!session || session.role !== "master") return null;
  return session;
}

/** Master ou administrador (rotas partilhadas da equipa). */
export async function requireStaffSession() {
  const session = await getStaffSession();
  if (!session) return null;
  return session;
}
