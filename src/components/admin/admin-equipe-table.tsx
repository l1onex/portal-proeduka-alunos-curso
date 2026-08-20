"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminListRow } from "@/lib/admin/load-admins";
import { formatDateBR } from "@/lib/format-br";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

type Props = {
  rows: AdminListRow[];
  currentUserId: string;
};

export function AdminEquipeTable({ rows, currentUserId }: Props) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    if (!passwordModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [passwordModal]);

  useEffect(() => {
    if (!passwordModal) {
      setPwNext("");
      setPwConfirm("");
      setPwErr(null);
    }
  }, [passwordModal]);

  async function remove(id: string) {
    const ok = await confirm({
      title: "Remover utilizador?",
      message:
        "Tem certeza de que deseja remover este utilizador? Ele perderá acesso ao painel.",
      confirmLabel: "Sim, remover",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        await alert({
          title: "Não foi possível remover",
          message: data.error ?? "Erro ao remover.",
          variant: "danger",
        });
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordModal) return;
    setPwErr(null);
    if (pwNext.length < 6) {
      setPwErr("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwErr("As senhas não coincidem.");
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch(
        `/api/admin/admins/${passwordModal.id}/reset-password`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: pwNext }),
        },
      );
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setPwErr(error ?? "Erro ao redefinir.");
        return;
      }
      setPasswordModal(null);
    } catch (err) {
      setPwErr(networkErrorMessage(err));
    } finally {
      setPwBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center text-sm text-slate-600 shadow-inner">
        Nenhum administrador ou outro master na lista (além de si, se aplicável).
      </p>
    );
  }

  return (
    <>
      {dialog}
      {passwordModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-pw-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Fechar"
            disabled={pwBusy}
            onClick={() => !pwBusy && setPasswordModal(null)}
          />
          <form
            onSubmit={submitPassword}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl"
          >
            <h3
              id="staff-pw-title"
              className="text-lg font-bold text-[#D9571E]"
            >
              Nova senha
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Conta:{" "}
              <span className="font-mono text-xs break-all text-slate-800">
                {passwordModal.email}
              </span>
            </p>
            {pwErr ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {pwErr}
              </p>
            ) : null}
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Nova senha
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                minLength={6}
                required
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Confirmar
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                minLength={6}
                required
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pwBusy}
                onClick={() => setPasswordModal(null)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pwBusy}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
              >
                {pwBusy ? "A guardar…" : "Guardar senha"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-md shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-[#f8fbff]/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Nome</th>
                <th className="px-4 py-3 font-semibold text-slate-700">E-mail</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Papel</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Desde</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelf = row.id === currentUserId;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.role === "master"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.role === "master" ? "Master" : "Administrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDateBR(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-[#F66828] hover:underline disabled:opacity-50"
                          disabled={busyId === row.id}
                          onClick={() =>
                            setPasswordModal({ id: row.id, email: row.email })
                          }
                        >
                          Redefinir senha
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          disabled={busyId === row.id || isSelf}
                          title={
                            isSelf
                              ? "Não pode remover a própria conta aqui."
                              : undefined
                          }
                          onClick={() => remove(row.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
