import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getStaffSession } from "@/lib/api/staff-session";
import { getCurso } from "@/lib/api/cursos";
import { getSignedStorageUrl } from "@/lib/admin/signed-storage-url";
import { AdminCursoForm } from "@/components/admin/admin-curso-form";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function AdminCursoEditarPage({ params }: Props) {
  const session = await getStaffSession();
  if (!session || (session.role !== "master" && session.role !== "admin")) {
    redirect("/login?next=/admin/cursos");
  }
  const { id } = await params;
  if (!id?.trim()) {
    notFound();
  }
  const curso = await getCurso(id).catch(() => null);
  if (!curso) {
    notFound();
  }
  const imageUrl = await getSignedStorageUrl(curso.image_key);

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
          <h1 className="mt-1 text-2xl font-bold text-[#D9571E]">
            Editar curso
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Atualize o nome, descrição ou imagem.
          </p>
        </div>
      </header>

      <div className="mt-6">
        <AdminCursoForm
          initial={{
            id: curso.id,
            nome: curso.nome,
            descricao: curso.descricao,
            image_key: curso.image_key,
          }}
          initialImageUrl={imageUrl}
        />
      </div>
    </div>
  );
}