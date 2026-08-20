"use client";

import { useState } from "react";

import type { PendenciasAluno } from "@/lib/aluno-tabela";

import { PendenciasDrawer } from "@/components/aluno/pendencias-drawer";

type Props = {
  pendencias: PendenciasAluno;
};

/**
 * Card fino com ícone de aviso + texto + botão "Ver pendências".
 * Ao clicar no botão, abre um drawer lateral direito com a lista detalhada.
 *
 * Renderizado apenas quando há pendências (`totalCount > 0`) — quem chama
 * já deve garantir essa condição.
 */
export function PendenciasCallout({ pendencias }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="status"
        className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-amber-300/90 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 shadow-sm"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900"
          >
            {/* ícone "!" dentro de um triângulo — simples e acessível */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <p className="leading-snug">
            <strong className="font-semibold">Está pendente.</strong>{" "}
            <span className="text-amber-900/90">
              Há {pendencias.totalCount}{" "}
              {pendencias.totalCount === 1 ? "item pendente" : "itens pendentes"}{" "}
              para o seu cadastro ficar completo. Clique aqui para ver o que
              está pendente.
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          Ver pendências
        </button>
      </div>

      <PendenciasDrawer
        open={open}
        onClose={() => setOpen(false)}
        pendencias={pendencias}
      />
    </>
  );
}