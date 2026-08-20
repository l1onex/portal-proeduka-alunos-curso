import Link from "next/link";
import { CreateStudentForm } from "@/components/admin/create-student-form";

export default function AdminNovoAlunoPage() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-48 w-48 rounded-full bg-[#F66828]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-32 h-40 w-40 rounded-full bg-[#D9571E]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-slate-50/90 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
              Novo registro
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
              Cadastrar aluno
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Acesso ao portal, dados acadêmicos e endereço. Integração com a base
              em curso — campos opcionais podem ficar em branco.
            </p>
          </div>
          <Link
            href="/admin/alunos"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white/90 px-4 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/90"
          >
            Voltar
          </Link>
        </div>
      </div>

      <CreateStudentForm />
    </div>
  );
}
