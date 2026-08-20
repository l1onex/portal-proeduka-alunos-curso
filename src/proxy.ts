import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionJwt } from "@/lib/auth/jwt";

/** Quando há sessão válida em `/login`, faz o mesmo encaminhar que antes (admin vs aluno). */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /** Favicon / ícone — não passar por auth (gerado por app/icon.tsx). */
  if (pathname === "/icon" || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

  /** Sem cookie / token inválido / env incompleto — deixa cada layout tratar redirects. */
  const session =
    token == null ? null : await verifySessionJwt(token);

  const search = request.nextUrl.search;

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (session?.typ === "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (session?.typ === "student") {
      const url = request.nextUrl.clone();
      url.pathname = "/aluno";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!session || session.typ !== "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    if (session.role !== "master" && session.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/aluno")) {
    if (!session || session.typ !== "student") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
