import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminEquipeTable } from "@/components/admin/admin-equipe-table";
import { CreateAdminForm } from "@/components/admin/create-admin-form";
import { loadAdminsWithEmails } from "@/lib/admin/load-admins";
import { getStaffSession } from "@/lib/api/staff-session";

export default async function AdminEquipePage() {
  const session = await getStaffSession();
  if (!session) redirect("/login?next=/admin/equipe");
  if (session.role !== "master") {
    return (
      <div className="relative mx-auto max-w-lg px-4">
        <div
          className="pointer-events-none absolute -left-4 -top-4 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-6 py-10 text-center shadow-lg shadow-amber-100/50">
          <p className="font-semibold text-amber-950">Acesso restrito ao master</p>
          <p className="mt-2 text-sm text-amber-900/90">
            Apenas o usuário master pode gerenciar administradores.
          </p>
          <Link
            href="/admin"
            className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/80"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { admins, error } = await loadAdminsWithEmails();

  return (
    <div className="relative mx-auto max-w-6xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-56 w-56 rounded-full bg-[#F66828]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-[#D9571E]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-slate-50/90 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Gestão de acessos
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
              Equipe administrativa
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Cadastre administradores ou outros masters, redefina senhas quando
              pedirem e remova acessos quando necessário. Só o master gere esta
              página.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/90"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>

      <div className="space-y-10">
        <CreateAdminForm />

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            {error}
          </p>
        ) : null}

        <section>
          <h2 className="mb-4 text-lg font-bold text-[#D9571E]">
            Equipe (master e administradores)
          </h2>
          <AdminEquipeTable rows={admins} currentUserId={session.userId} />
        </section>
      </div>
    </div>
  );
}
