"use client";

import { useEffect, useState, type ReactNode } from "react";

type Variant = "danger" | "default" | "success";

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
};

type AlertOptions = {
  title: string;
  message: ReactNode;
  okLabel?: string;
  variant?: Variant;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
type AlertFn = (opts: AlertOptions) => Promise<void>;

type InternalState = {
  mode: "confirm" | "alert";
  opts: ConfirmOptions | AlertOptions;
  resolve: (ok: boolean) => void;
} | null;

type Props = {
  state: InternalState;
  onClose: (ok: boolean) => void;
};

/** Diálogo modal bonito para confirmação (substitui `window.confirm`). */
export function ConfirmDialog({ state, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration: só anima após mount no cliente.
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Enter") onClose(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  const variant: Variant = state.opts.variant ?? "default";
  const isAlert = state.mode === "alert";
  const confirmCls =
    variant === "danger"
      ? "bg-gradient-to-br from-red-500 to-red-600 hover:opacity-95 text-white"
      : variant === "success"
        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:opacity-95 text-white"
        : "bg-gradient-to-br from-[#F66828] to-[#D9571E] hover:opacity-95 text-white";
  const confirmLabel = isAlert
    ? ((state.opts as AlertOptions).okLabel ?? "OK")
    : ((state.opts as ConfirmOptions).confirmLabel ?? "Confirmar");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${
        mounted ? "animate-[fadeIn_0.15s_ease-out]" : ""
      }`}
      onClick={() => onClose(false)}
    >
      {/* backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
      />
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pt-6">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              variant === "danger"
                ? "bg-red-100 text-red-700"
                : variant === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
            }`}
            aria-hidden
          >
            {variant === "danger" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            ) : variant === "success" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-900"
            >
              {state.opts.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => onClose(false)}
            className="-mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-2 pt-3 text-sm leading-relaxed text-slate-700">
          {state.opts.message}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
          {isAlert ? null : (
            <button
              type="button"
              onClick={() => onClose(false)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {(state.opts as ConfirmOptions).cancelLabel ?? "Cancelar"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onClose(true)}
            className={`inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook para usar o diálogo: `const { confirm, alert, dialog } = useConfirmDialog();`
 *  use `await confirm({...})` para confirmar/recusar ou `await alert({...})` para aviso.
 *  Renderize `dialog` uma vez no JSX da tela. */
export function useConfirmDialog(): {
  confirm: ConfirmFn;
  alert: AlertFn;
  dialog: ReactNode;
} {
  const [state, setState] = useState<InternalState>(null);

  function close(ok: boolean) {
    setState((s) => {
      if (s) s.resolve(ok);
      return null;
    });
  }

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ mode: "confirm", opts, resolve });
    });
  }

  function alert(opts: AlertOptions): Promise<void> {
    return new Promise((resolve) => {
      setState({
        mode: "alert",
        opts,
        resolve: () => resolve(),
      });
    });
  }

  const dialog = <ConfirmDialog state={state} onClose={close} />;
  return { confirm, alert, dialog };
}