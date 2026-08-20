"use client";

import { useState } from "react";

import { BrandLoaderOrb } from "@/components/ui/brand-loader";

type Props = {
  src: string | null;
  name: string;
  email: string;
};

function initialLetter(name: string, email: string) {
  const n = name.trim();
  if (n && n !== "—") {
    const c = n.charAt(0);
    if (c && /[A-Za-zÀ-ÿ0-9]/.test(c)) return c.toUpperCase();
  }
  const e = email.trim();
  if (e && e !== "—") return e.charAt(0).toUpperCase();
  return "?";
}

export function StudentCardAvatar({ src, name, email }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const letter = initialLetter(name, email);
  const showImg = Boolean(src && !broken);

  return (
    <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 ring-2 ring-white shadow-md">
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#D9571E]/75">
        {letter}
      </div>
      {showImg && src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
          />
          {!loaded ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#eef6ff]/85 to-slate-100/90 backdrop-blur-[2px]"
              aria-busy
            >
              <BrandLoaderOrb size="sm" aria-label="Carregando foto" />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
