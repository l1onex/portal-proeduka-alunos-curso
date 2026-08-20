"use client";

import { useEffect } from "react";

import type { PendenciasAluno } from "@/lib/aluno-tabela";

type Props = {
  open: boolean;
  onClose: () => void;
  pendencias: PendenciasAluno;
};

/**
 * Drawer lateral direito com a lista detalhada de pendências.
 * Implementado com `<dialog>` HTML nativo (sem libs externas).
 *
 * - Fica sobreposto (`fixed inset-0` com backdrop escuro).
 * - Fecha com Esc, clique fora, ou no botão "Fechar".
 */
export function PendenciasDrawer({ open, onClose, pendencias }: Props) {
  // Fecha com a tecla Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pendências do cadastro"
      className="fixed inset-0 z-50"
    >
      {/* backdrop — clicar fecha */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />

      {/* painel lateral direito */}
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl shadow-slate-900/30 sm:w-[28rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#D9571E]">
              Pendências do cadastro
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {pendencias.totalCount}{" "}
              {pendencias.totalCount === 1
                ? "item precisa de atenção"
                : "itens precisam de atenção"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {pendencias.informacoes.length > 0 ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Informações
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                {pendencias.informacoes.map((p) => (
                  <li
                    key={`i-${p.key}`}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2"
                  >
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F66828]" />
                    <span>{p.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {pendencias.documentos.length > 0 ? (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Documentos
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                {pendencias.documentos.map((p) => (
                  <li
                    key={`d-${p.key}`}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2"
                  >
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9571E]" />
                    <span>{p.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Fechar
          </button>
        </footer>
      </aside>
    </div>
  );
}