"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";

const CloseCtx = createContext<() => void>(() => {});

/** Fecha o menu lateral no mobile (no-op no desktop). */
export function useCloseMobileNav() {
  return useContext(CloseCtx);
}

type Props = {
  mobileTitle: string;
  children: React.ReactNode;
};

/**
 * Barra fixa com hamburger + drawer deslizante (mobile) e sidebar fixa (lg+).
 */
export function AppSideNavShell({ mobileTitle, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const id = requestAnimationFrame(() => close());
    return () => cancelAnimationFrame(id);
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <CloseCtx.Provider value={close}>
      {/* Barra superior — só mobile */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-white/15 bg-gradient-to-r from-[#D9571E] to-[#F66828] px-4 shadow-md lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="app-side-drawer"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
        >
          <MenuIcon />
        </button>
        <Image
          src={BRAND_LOGO_URL}
          alt=""
          width={120}
          height={32}
          className="h-7 w-auto object-contain brightness-0 invert"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {mobileTitle}
        </span>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        id="app-side-drawer"
        className={[
          "fixed left-0 z-50 flex w-64 max-w-[min(100vw,18rem)] flex-col border-r border-white/10 bg-gradient-to-b from-[#D9571E] to-[#F66828] text-white shadow-2xl transition-transform duration-300 ease-out",
          "top-14 bottom-0 lg:top-0 lg:bottom-0",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        {children}
      </aside>
    </CloseCtx.Provider>
  );
}

function MenuIcon() {
  return (
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
  );
}
