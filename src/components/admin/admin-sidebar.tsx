"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppSideNavShell,
  useCloseMobileNav,
} from "@/components/layout/app-side-nav-shell";
import { AdminNotificationBell } from "./admin-notification-bell";
import { AdminLogoutButton } from "./admin-logout-button";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

type NavItem = { href: string; label: string; masterOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/alunos", label: "Alunos" },
  {
    href: "/admin/cursos/solicitacoes",
    label: "Solicitações de curso",
  },
  {
    href: "/admin/certificados/solicitacoes",
    label: "Solicitações de certificado",
    masterOnly: true,
  },
  { href: "/admin/certificados", label: "Certificados", masterOnly: true },
  { href: "/admin/equipe", label: "Equipe administrativa", masterOnly: true },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/webhooks", label: "Webhooks", masterOnly: true },
  { href: "/admin/api", label: "API & integrações", masterOnly: true },
  { href: "/admin/tutoriais", label: "Vídeos tutoriais" },
];

function linkClass(active: boolean) {
  return [
    "flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition",
    active
      ? "bg-white/15 text-white"
      : "text-white/85 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

type Props = {
  role: "master" | "admin";
  userEmail: string;
  displayName: string | null;
};

function NavLinks({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const close = useCloseMobileNav();
  return (
    <>
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : item.href === "/admin/certificados"
              ? pathname === "/admin/certificados"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(active)}
            onClick={close}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function AdminDrawerHeader() {
  const close = useCloseMobileNav();
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
      <Image
        src={BRAND_LOGO_URL}
        alt="Proeduca"
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

export function AdminSidebar({ role, userEmail, displayName }: Props) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.masterOnly || role === "master");

  return (
    <AppSideNavShell mobileTitle="Administração">
      <AdminDrawerHeader />

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3">
        <NavLinks items={items} pathname={pathname} />
      </nav>

      <div className="border-t border-white/10 p-4">
        <AdminNotificationBell />
        <div className="mb-3 mt-1 rounded-lg bg-white/10 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold uppercase tracking-wide text-white/70">
              {role === "master" ? "Master" : "Admin"}
            </span>
          </div>
          <p className="mt-1 truncate font-medium text-white">
            {displayName ?? userEmail}
          </p>
          <p className="truncate text-white/70">{userEmail}</p>
        </div>
        <AdminLogoutButton />
      </div>
    </AppSideNavShell>
  );
}
