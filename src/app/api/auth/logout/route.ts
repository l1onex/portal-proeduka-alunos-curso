import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { cookieSecureFromForwardedProto } from "@/lib/http/cookie-secure";

export async function POST() {
  const forwarded = (await headers()).get("x-forwarded-proto");
  const secure = cookieSecureFromForwardedProto(forwarded);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 0,
  });
  return res;
}
