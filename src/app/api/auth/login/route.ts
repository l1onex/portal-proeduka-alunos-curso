import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { authenticateEmailPassword } from "@/lib/auth/resolve-login";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth/constants";
import { cookieSecureFromForwardedProto } from "@/lib/http/cookie-secure";

type Body = {
  email?: string;
  password?: string;
  /** Preferência do cliente quando corresponde ao tipo da conta (`/admin` ou `/aluno`). */
  next?: unknown;
};

function pickRedirect(base: "/admin" | "/aluno", next: unknown): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    if (base === "/admin" && next.startsWith("/admin")) {
      return next;
    }
    if (base === "/aluno" && next.startsWith("/aluno")) {
      return next;
    }
  }
  return base;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe e-mail e senha.", code: "bad_credentials" },
      { status: 400 },
    );
  }

  const auth = await authenticateEmailPassword({ email, password });
  if (!auth.ok) {
    if (auth.reason === "bad_credentials") {
      return NextResponse.json(
        {
          error:
            "E-mail ou senha incorretos. Verifique os dados ou peça ajuda à instituição.",
          code: "bad_credentials",
        },
        { status: 401 },
      );
    }
    if (auth.reason === "no_student_record") {
      return NextResponse.json(
        {
          error:
            "Este e-mail não está registado como aluno. Use o mesmo e-mail da sua matrícula ou peça ajuda à instituição.",
          code: "no_student_record",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error: auth.detail ?? "Não foi possível autenticar.",
        code: "db",
      },
      { status: 503 },
    );
  }

  const forwarded = (await headers()).get("x-forwarded-proto");
  const secure = cookieSecureFromForwardedProto(forwarded);

  const target = pickRedirect(auth.value.redirect, body.next);
  const res = NextResponse.json({
    ok: true,
    redirect: target,
  });

  res.cookies.set(SESSION_COOKIE_NAME, auth.value.token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: SESSION_MAX_AGE_SEC,
  });

  return res;
}
