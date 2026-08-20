"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/validador", label: "Validador" },
  { href: "/suporte", label: "Suporte" },
  { href: "/login", label: "Entrar" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:h-[3.75rem] sm:px-6">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="public-site-drawer"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-slate-700 transition hover:bg-slate-100 lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center transition-opacity hover:opacity-90 lg:flex-initial"
            onClick={() => setOpen(false)}
          >
            <Image
              src={BRAND_LOGO_URL}
              alt="ProEduka"
              width={160}
              height={44}
              className="h-8 w-auto max-w-[min(100%,9rem)] object-contain object-left sm:h-9 sm:max-w-none"
              priority
            />
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) =>
              item.href === "/login" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-[#D9571E]/15 transition hover:opacity-95 hover:shadow-lg"
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href))
                      ? "bg-slate-100 text-[#D9571E]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#D9571E]"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <Link
            href="/login"
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F66828] to-[#D9571E] px-4 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-[#D9571E]/15 transition hover:opacity-95 hover:shadow-lg lg:hidden"
          >
            Entrar
          </Link>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        id="public-site-drawer"
        className={[
          "fixed left-0 top-0 z-50 flex h-full w-[min(100vw,19rem)] flex-col border-r border-slate-200/90 bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <span className="text-sm font-bold text-[#D9571E]">Menu</span>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
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
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "rounded-xl px-4 py-3 text-base font-semibold transition",
                  active
                    ? "bg-gradient-to-r from-[#F66828]/15 to-[#D9571E]/10 text-[#D9571E]"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
