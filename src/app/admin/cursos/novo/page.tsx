import Link from "next/link";
import { redirect } from "next/navigation";

import { getStaffSession } from "@/lib/api/staff-session";
import { AdminCursoForm } from "@/components/admin/admin-curso-form";

export const dynamic = "force-dynamic";

export default async function AdminCursoNovoPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    redirect("/login?next=/admin/cursos/novo");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/cursos"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            ← Voltar para Cursos
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#D9571E]">Novo curso</h1>
          <p className="mt-1 text-sm text-slate-600">
            Preencha o nome, descrição e envie uma imagem de capa.
          </p>
        </div>
      </header>

      <div className="mt-6">
        <AdminCursoForm />
      </div>
    </div>
  );
}