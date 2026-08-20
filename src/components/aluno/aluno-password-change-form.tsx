"use client";

import { useState } from "react";

import { networkErrorMessage } from "@/lib/client/fetch-api-json";

const BR =
  "rounded-xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8";
const inputClass =
  "mt-1 w-full rounded-xl border border-[#9eb5d1] bg-white px-3 py-2.5 text-[15px] text-neutral-950 outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";
const btnPrimary =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50";

type Props = {
  userEmail: string;
};

export function AlunoPasswordChangeForm({ userEmail }: Props) {
  const [current, setCurrent] = useState("");
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
      setErr("A confirmação não coincide com a nova senha.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/aluno/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: current,
          new_password: next,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setErr(
          typeof j.error === "string" && j.error.length > 0
            ? j.error
            : "Não foi possível atualizar a senha.",
        );
        return;
      }

      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg("Senha alterada com sucesso.");
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={BR}>
      <h1 className="text-2xl font-extrabold text-[#D9571E]">Perfil e senha</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
        O e-mail de acesso é o mesmo da sua matrícula e{" "}
        <strong className="font-semibold text-slate-800">não pode ser alterado</strong>{" "}
        aqui. Pode apenas definir uma nova senha quando quiser.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">E-mail de login</span>
        <p className="mt-1 font-mono text-[0.9rem]">{userEmail}</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label
            htmlFor="pw-current"
            className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900"
          >
            Senha atual
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <div>
          <label
            htmlFor="pw-new"
            className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900"
          >
            Nova senha
          </label>
          <input
            id="pw-new"
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
            htmlFor="pw-confirm"
            className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900"
          >
            Confirmar nova senha
          </label>
          <input
            id="pw-confirm"
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
          {busy ? "A guardar…" : "Alterar senha"}
        </button>
      </form>
    </section>
  );
}
