"use client";

import { useState } from "react";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";

const BR =
  "mt-8 rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8";
const inputClass =
  "mt-1 w-full rounded-xl border border-[#9eb5d1] bg-white px-3 py-2.5 text-[15px] text-neutral-950 outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";
const btnPrimary =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50";

type Props = {
  studentId: string;
  studentEmail: string;
};

export function AdminStudentPasswordReset({ studentId, studentEmail }: Props) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (next.length < 6) {
      setErr("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (next !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/students/${studentId}/reset-password`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: next }),
        },
      );
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao redefinir.");
        return;
      }
      setNext("");
      setConfirm("");
      setMsg("Nova senha definida. Informe o aluno por um canal seguro.");
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={BR}>
      <h2 className="text-lg font-bold text-[#D9571E]">Redefinir senha do aluno</h2>
      <p className="mt-1 text-sm text-slate-600">
        Use quando o aluno perder o acesso. Será criada uma nova senha na conta
        Auth associada ao e-mail da ficha. O e-mail em si não é alterado.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">E-mail da conta</span>
        <p className="mt-1 font-mono text-[0.9rem] break-all">{studentEmail}</p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label
            htmlFor="admin-pw-new"
            className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900"
          >
            Nova senha
          </label>
          <input
            id="admin-pw-new"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={busy}
            required
            minLength={6}
          />
        </div>
        <div>
          <label
            htmlFor="admin-pw-confirm"
            className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900"
          >
            Confirmar nova senha
          </label>
          <input
            id="admin-pw-confirm"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            required
            minLength={6}
          />
        </div>

        {err ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {msg}
          </p>
        ) : null}

        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "A guardar…" : "Definir nova senha"}
        </button>
      </form>
    </section>
  );
}
