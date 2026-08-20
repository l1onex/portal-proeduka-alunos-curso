"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

export type EditStudentInitial = {
  full_name: string;
  email: string;
  unit: string;
  student_date: string;
  consultant: string;
  course: string;
  birth_date: string;
  cpf: string;
  phone: string;
  rg: string;
  father_name: string;
  mother_name: string;
  profession: string;
  nationality: string;
  cep: string;
  address: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function AdminEditStudentForm({
  studentId,
  initial,
}: {
  studentId: string;
  initial: EditStudentInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") payload[k] = v;
    });

    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao salvar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#D9571E]">
          Editar informações do aluno
        </h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {open ? "Fechar" : "Editar dados"}
        </button>
      </div>
      {open ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Nome completo</span>
              <input
                className={`${inputClass} mt-1`}
                name="full_name"
                required
                defaultValue={initial.full_name}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">E-mail</span>
              <input
                className={`${inputClass} mt-1`}
                name="email"
                type="email"
                required
                defaultValue={initial.email}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["unit", "Unidade"],
                ["student_date", "Data (registro)", "date"],
                ["consultant", "Consultor"],
                ["course", "Curso"],
                ["birth_date", "Data de nascimento", "date"],
                ["cpf", "CPF"],
                ["phone", "Telefone"],
                ["rg", "RG"],
              ] as const
            ).map(([name, label, type]) => (
              <label key={name} className="block text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <input
                  className={`${inputClass} mt-1`}
                  name={name}
                  type={type === "date" ? "date" : "text"}
                  defaultValue={
                    initial[name as keyof EditStudentInitial] as string
                  }
                />
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Nome do pai</span>
              <input
                className={`${inputClass} mt-1`}
                name="father_name"
                defaultValue={initial.father_name}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Nome da mãe</span>
              <input
                className={`${inputClass} mt-1`}
                name="mother_name"
                defaultValue={initial.mother_name}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Profissão</span>
              <input
                className={`${inputClass} mt-1`}
                name="profession"
                defaultValue={initial.profession}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Naturalidade</span>
              <input
                className={`${inputClass} mt-1`}
                name="nationality"
                defaultValue={initial.nationality}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["cep", "CEP"],
                ["address", "Endereço"],
                ["address_number", "Número"],
                ["address_complement", "Complemento (opcional)"],
                ["neighborhood", "Bairro"],
                ["city", "Cidade"],
                ["state", "Estado"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="block text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <input
                  className={`${inputClass} mt-1`}
                  name={name}
                  defaultValue={
                    initial[name as keyof EditStudentInitial] as string
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
