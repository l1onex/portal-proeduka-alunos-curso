"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

const sectionClass =
  "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-200/50 sm:p-6";

export function CreateAdminForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    const fd = new FormData(form);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      full_name: String(fd.get("full_name") ?? "").trim(),
      as_master: fd.get("as_master") === "on",
    };

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro ao criar administrador.");
        return;
      }
      form.reset();
      router.refresh();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={sectionClass}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F66828]/10 blur-2xl"
        aria-hidden
      />
      <h2 className="relative text-lg font-bold text-[#D9571E]">
        Novo administrador
      </h2>
      <p className="relative mt-1 text-sm text-slate-600">
        Somente o master pode criar contas. Por defeito é{" "}
        <strong>administrador comum</strong>; marque abaixo para criar outro{" "}
        <strong>master</strong>.
      </p>
      {error ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-orange-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-1">
          <span className="font-medium text-slate-700">Nome completo</span>
          <input
            className={`${inputClass} mt-1`}
            name="full_name"
            required
            placeholder="Nome"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">E-mail</span>
          <input
            className={`${inputClass} mt-1`}
            name="email"
            type="email"
            required
            placeholder="admin@escola.com"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Senha inicial</span>
          <input
            className={`${inputClass} mt-1`}
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
      </div>
      <label className="relative mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="as_master"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#F66828] focus:ring-[#F66828]"
        />
        <span className="text-slate-700">
          <span className="font-semibold text-slate-900">Criar como master</span>
          <span className="mt-0.5 block text-xs text-slate-600">
            Selecionado: acesso total (como você). Desmarcado: administrador
            comum.
          </span>
        </span>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="relative mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "Criando…" : "Adicionar administrador"}
      </button>
    </form>
  );
}
