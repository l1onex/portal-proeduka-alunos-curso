import { SignJWT, jwtVerify } from "jose";

import { SESSION_MAX_AGE_SEC } from "@/lib/auth/constants";

export type SessionTokenPayload = {
  sub: string;
  email: string;
  /** staff = equipa institucional; student = portal do aluno */
  typ: "staff" | "student";
  /** Só quando `typ === "staff"` */
  role?: "master" | "admin";
  /** Só quando `typ === "student"` */
  sid?: string;
};

/** Build / CI pode correr sem segredo definido quando `DATABASE_URL`/login não são usados. */
const CI_SESSION_FALLBACK_SECRET =
  "ci-build-session-secret-do-not-use-in-production-xxxxxxxx";

export function encodeSessionSecretKey(): Uint8Array {
  let s = process.env.SESSION_SECRET?.trim();
  if ((!s || s.length < 32) && process.env.CI === "true") {
    s = CI_SESSION_FALLBACK_SECRET;
  }
  if (!s || s.length < 32) {
    throw new Error(
      "Defina SESSION_SECRET com pelo menos 32 caracteres (assinatura JWT).",
    );
  }
  return new TextEncoder().encode(s);
}

export async function signSessionJwt(
  payload: SessionTokenPayload,
): Promise<string> {
  const key = encodeSessionSecretKey();
  const now = Math.floor(Date.now() / 1000);

  const builder = new SignJWT({
    email: payload.email,
    typ: payload.typ,
    ...(payload.typ === "staff" && payload.role
      ? { role: payload.role }
      : {}),
    ...(payload.typ === "student" && payload.sid ? { sid: payload.sid } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SEC);

  return builder.sign(key);
}

export async function verifySessionJwt(
  token: string | undefined | null,
): Promise<SessionTokenPayload | null> {
  if (!token?.trim()) return null;

  try {
    const key = encodeSessionSecretKey();
    const { payload } = await jwtVerify(token.trim(), key, {
      algorithms: ["HS256"],
    });

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email =
      typeof payload.email === "string"
        ? payload.email
        : sub
          ? ""
          : "";
    const typ = payload.typ === "staff" || payload.typ === "student"
      ? payload.typ
      : null;

    if (!sub || !typ) return null;

    const base = { sub, email } as Pick<SessionTokenPayload, "sub" | "email">;

    if (typ === "staff") {
      const role = payload.role === "master" || payload.role === "admin"
        ? payload.role
        : null;
      if (!role) return null;
      return {
        ...base,
        typ: "staff",
        role,
      };
    }

    const sid = typeof payload.sid === "string" ? payload.sid.trim() : "";
    if (!sid) return null;
    return {
      ...base,
      typ: "student",
      sid,
    };
  } catch {
    return null;
  }
}
