import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionJwt } from "@/lib/auth/jwt";

export type StaffRole = "master" | "admin";

export type StaffSession = {
  userId: string;
  email: string;
  role: StaffRole;
};

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionJwt(token);
  if (!payload || payload.typ !== "staff" || !payload.role) return null;

  const role = payload.role;
  if (role !== "master" && role !== "admin") return null;

  return {
    userId: payload.sub,
    email:
      payload.email?.trim()?.toLowerCase() ??
      "",
    role,
  };
}
