import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionJwt } from "@/lib/auth/jwt";

export type StudentSession = {
  userId: string;
  studentId: string;
  email: string | null;
};

export async function getStudentSession(): Promise<StudentSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionJwt(token);
  if (!payload || payload.typ !== "student") return null;
  const sid = payload.sid?.trim();
  if (!sid) return null;

  return {
    userId: payload.sub,
    studentId: sid,
    email: payload.email?.trim()?.toLowerCase() ?? null,
  };
}
