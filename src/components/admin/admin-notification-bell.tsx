"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTimeBrazil } from "@/lib/format-br";

type NotificationItem = {
  id: string;
  created_at: string;
  kind: string;
  student_id: string | null;
  student_name: string | null;
  body: string;
  metadata: Record<string, unknown> | null;
};

/** Decide o destino do clique conforme o `kind` da notificação. */
function destinationForNotification(n: NotificationItem): string {
  switch (n.kind) {
    case "curso_solicitado":
      return "/admin/cursos/solicitacoes";
    case "curso_liberado":
      return "/admin/cursos/solicitacoes";
    case "curso_recusado":
      return "/admin/cursos/solicitacoes";
    case "certificado_solicitado":
      return "/admin/certificados/solicitacoes";
    default:
      // Genérico / legado: vai para a ficha do aluno quando existir.
      return n.student_id ? `/admin/alunos/${n.student_id}` : "/admin";
  }
}

export function AdminNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(async (id: string) => {
    setDismissingId(id);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/notifications/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(
          typeof j.error === "string"
            ? j.error
            : "Não foi possível remover o aviso.",
        );
        return false;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      return true;
    } catch {
      setErr("Falha de rede ao remover o aviso.");
      return false;
    } finally {
      setDismissingId(null);
    }
  }, []);

  /** `silent`: não mostra spinner nem apaga lista (atualização em fundo). */
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setErr(null);
    }
    try {
      const res = await fetch("/api/admin/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json()) as {
        notifications?: NotificationItem[];
        error?: string;
      };
      if (!res.ok) {
        if (!silent) {
          setErr(typeof j.error === "string" ? j.error : "Erro ao carregar.");
        }
        return;
      }
      setItems(Array.isArray(j.notifications) ? j.notifications : []);
      if (!silent) setErr(null);
    } catch {
      if (!silent) setErr("Falha de rede.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  /** Enquanto o painel admin está aberto, atualiza a lista a cada 20 s (sem precisar de reload). */
  useEffect(() => {
    const t = window.setInterval(() => void load(true), 20_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void load(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    function onFocus() {
      void load(true);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const recentCount = items.length;

  return (
    <div ref={wrapRef} className="relative mb-3">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void load(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notificações"
      >
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {recentCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
              {recentCount > 9 ? "9+" : recentCount}
            </span>
          ) : null}
        </span>
        <span className="text-left text-xs font-semibold uppercase tracking-wide text-white/90">
          Avisos
        </span>
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[min(70vh,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Notificações
            </p>
            {err ? (
              <p className="mt-1 text-xs text-red-600">{err}</p>
            ) : loading ? (
              <p className="mt-1 text-xs text-slate-500">A carregar…</p>
            ) : null}
          </div>
          <ul className="max-h-[min(60vh,18rem)] overflow-y-auto overscroll-contain">
            {items.length === 0 && !loading ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                Sem notificações recentes.
              </li>
            ) : (
              items.map((n) => {
                  const dest = destinationForNotification(n);
                  const hasStudent = Boolean(n.student_id);
                  return (
                    <li
                      key={n.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      {hasStudent ? (
                        <button
                          type="button"
                          disabled={dismissingId === n.id}
                          className="block w-full px-3 py-2.5 text-left transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
                          onClick={async () => {
                            const ok = await dismiss(n.id);
                            if (ok) {
                              setOpen(false);
                              router.push(dest);
                            }
                          }}
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {n.body}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatDateTimeBrazil(n.created_at)}
                          </p>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={dismissingId === n.id}
                          className="block w-full px-3 py-2.5 text-left transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
                          onClick={async () => {
                            const ok = await dismiss(n.id);
                            if (ok) {
                              setOpen(false);
                              router.push(dest);
                            }
                          }}
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {n.body}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatDateTimeBrazil(n.created_at)}
                          </p>
                        </button>
                      )}
                    </li>
                  );
                })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
