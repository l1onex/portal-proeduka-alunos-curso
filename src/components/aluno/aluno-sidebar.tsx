"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppSideNavShell,
  useCloseMobileNav,
} from "@/components/layout/app-side-nav-shell";
import { AlunoLogoutButton } from "@/components/aluno/aluno-logout-button";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

function linkClass(active: boolean) {
  return [
    "flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition",
    active
      ? "bg-white/15 text-white"
      : "text-white/85 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

type Props = {
  userEmail: string;
};

function AlunoNavLinks({
  pathname,
}: {
  pathname: string;
}) {
  const close = useCloseMobileNav();
  const isPortal = pathname === "/aluno" || pathname === "/aluno/";
  const isCursos = pathname.startsWith("/aluno/cursos");
  const isValidacao = pathname.startsWith("/aluno/validacao");
  const isTutoriais = pathname.startsWith("/aluno/tutoriais");
  const isSuporte = pathname.startsWith("/aluno/suporte");
  const isPerfil = pathname.startsWith("/aluno/perfil");

  return (
    <>
      <Link href="/aluno" className={linkClass(isPortal)} onClick={close}>
        Portal do aluno
      </Link>
      <Link href="/aluno/perfil" className={linkClass(isPerfil)} onClick={close}>
        Perfil
      </Link>
      <Link href="/aluno/cursos" className={linkClass(isCursos)} onClick={close}>
        Cursos
      </Link>
      <Link href="/aluno/validacao" className={linkClass(isValidacao)} onClick={close}>
        Validação
      </Link>
      <Link href="/aluno/tutoriais" className={linkClass(isTutoriais)} onClick={close}>
        Tutoriais
      </Link>
      <Link href="/aluno/suporte" className={linkClass(isSuporte)} onClick={close}>
        Suporte
      </Link>
    </>
  );
}

function AlunoDrawerHeader() {
  const close = useCloseMobileNav();
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
      <Image
        src={BRAND_LOGO_URL}
        alt="ProEduka"
        width={140}
        height={40}
        className="h-8 w-auto object-contain brightness-0 invert"
      />
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={close}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white transition hover:bg-white/10 lg:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function AlunoSidebar({ userEmail }: Props) {
  const pathname = usePathname();

  return (
    <AppSideNavShell mobileTitle="Área do aluno">
      <AlunoDrawerHeader />

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3">
        <AlunoNavLinks pathname={pathname} />
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-lg bg-white/10 px-3 py-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-white/70">
            Aluno
          </span>
          <p className="mt-1 truncate font-medium text-white">{userEmail}</p>
        </div>
        <AlunoLogoutButton />
      </div>
    </AppSideNavShell>
  );
}
