"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { NaturalidadeFields } from "@/components/aluno/naturalidade-fields";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { isValidCPF } from "@/lib/validation/cpf";

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

const sectionClass =
  "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-200/50 sm:p-6";

export function CreateStudentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [naturalidadeUf, setNaturalidadeUf] = useState("");
  const [naturalidadeCidade, setNaturalidadeCidade] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessNote(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") payload[k] = v;
    });
    payload.naturalidade_uf = naturalidadeUf.trim();
    payload.naturalidade_cidade = naturalidadeCidade.trim();

    const cpfRaw = typeof payload.cpf === "string" ? payload.cpf.trim() : "";
    if (cpfRaw && !isValidCPF(cpfRaw)) {
      setError("Informe um CPF válido ou deixe o campo em branco.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { ok, error, data } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro ao criar aluno.");
        return;
      }
      if (
        data.linked_existing_row === true &&
        typeof data.message === "string"
      ) {
        setSuccessNote(data.message);
        return;
      }
      router.push("/admin/alunos");
      router.refresh();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (successNote) {
    return (
      <div
        className={`${sectionClass} border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 to-white`}
      >
        <p className="text-sm font-medium text-emerald-950">{successNote}</p>
        <p className="mt-2 text-xs leading-relaxed text-emerald-900/90">
          O aluno entra com este e-mail e a senha que você definiu; no portal
          ele vê os mesmos dados que já existiam no cadastro (nada foi
          duplicado).
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              router.push("/admin/alunos");
              router.refresh();
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:flex-initial"
          >
            Ir para lista de alunos
          </button>
          <button
            type="button"
            onClick={() => setSuccessNote(null)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 border-emerald-300/80 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50/80 sm:flex-initial"
          >
            Cadastrar outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          {error}
        </div>
      ) : null}

      <section className={sectionClass}>
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F66828]/10 blur-2xl"
          aria-hidden
        />
        <h2 className="relative text-lg font-bold text-[#D9571E]">
          Acesso ao portal
        </h2>
        <p className="relative mt-1 text-sm leading-relaxed text-slate-600">
          E-mail e senha temporária para o aluno entrar no sistema. Se este
          e-mail já estiver no cadastro de alunos, apenas criamos o acesso: o
          registo continua único e o aluno vê os dados que já existiam.
        </p>
        <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Nome completo *</span>
            <input
              className={`${inputClass} mt-1.5`}
              name="full_name"
              required
              placeholder="Nome do aluno"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">E-mail *</span>
            <input
              className={`${inputClass} mt-1.5`}
              name="email"
              type="email"
              required
              placeholder="aluno@email.com"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Senha temporária *</span>
            <input
              className={`${inputClass} mt-1.5 max-w-md`}
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold text-[#D9571E]">Dados acadêmicos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Unidade</span>
            <input className={`${inputClass} mt-1.5`} name="unit" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Data (registro)</span>
            <input
              className={`${inputClass} mt-1.5`}
              name="student_date"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="Ex.: 01/04/2026"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Consultor</span>
            <input className={`${inputClass} mt-1.5`} name="consultant" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Curso</span>
            <input className={`${inputClass} mt-1.5`} name="course" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              Data de nascimento
            </span>
            <input
              className={`${inputClass} mt-1.5`}
              name="birth_date"
              type="text"
              inputMode="text"
              autoComplete="bday"
              placeholder="Ex.: 15/03/2000"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">CPF</span>
            <input
              className={`${inputClass} mt-1.5`}
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Opcional. Se preencher, deve ser um CPF válido.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Telefone</span>
            <input
              className={`${inputClass} mt-1.5`}
              name="phone"
              type="tel"
              autoComplete="tel"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">RG</span>
            <input className={`${inputClass} mt-1.5`} name="rg" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Órgão expedidor</span>
            <input
              className={`${inputClass} mt-1.5`}
              name="orgao_expedidor"
              placeholder="Ex.: SSP/SP"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              Data de expedição (RG)
            </span>
            <input
              className={`${inputClass} mt-1.5`}
              name="identidade_data_exp"
              inputMode="numeric"
              autoComplete="off"
              placeholder="dd/mm/aaaa"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              Possui deficiência?
            </span>
            <select
              className={`${inputClass} mt-1.5 cursor-pointer`}
              name="possui_deficiencia"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Estado civil</span>
            <select
              className={`${inputClass} mt-1.5 max-w-md cursor-pointer`}
              name="estado_civil"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="Divorciado(a)">Divorciado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
              <option value="União estável">União estável</option>
              <option value="Separado(a)">Separado(a)</option>
            </select>
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold text-[#D9571E]">
          Filiação e profissão
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Nome do pai</span>
            <input className={`${inputClass} mt-1.5`} name="father_name" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Nome da mãe</span>
            <input className={`${inputClass} mt-1.5`} name="mother_name" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Profissão</span>
            <input className={`${inputClass} mt-1.5`} name="profession" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Nacionalidade</span>
            <input className={`${inputClass} mt-1.5`} name="nacionalidade" />
          </label>
          <div className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Naturalidade</span>
            <NaturalidadeFields
              uf={naturalidadeUf}
              cidade={naturalidadeCidade}
              disabled={loading}
              inputClass={inputClass}
              onChange={(next) => {
                setNaturalidadeUf(next.naturalidade_uf ?? "");
                setNaturalidadeCidade(next.naturalidade_cidade ?? "");
              }}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold text-[#D9571E]">Endereço</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["cep", "CEP"],
            ["address", "Endereço"],
            ["address_number", "Número"],
            ["address_complement", "Complemento (opcional)"],
            ["neighborhood", "Bairro"],
            ["city", "Cidade"],
            ["state", "Estado"],
          ].map(([name, label]) => (
            <label key={name} className="block text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <input className={`${inputClass} mt-1.5`} name={name} />
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 sm:flex-initial"
        >
          {loading ? "Salvando…" : "Cadastrar aluno"}
        </button>
        <p className="text-center text-xs text-slate-500 sm:text-left">
          Campos sem * são opcionais.
        </p>
      </div>
    </form>
  );
}