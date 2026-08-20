import { notFound } from "next/navigation";
import { AlunoPortal } from "@/components/aluno/aluno-portal";
import { loadAlunoPortalData } from "@/lib/load-aluno-portal-data";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoDetalhePage({ params }: Props) {
  const { id } = await params;
  const loaded = await loadAlunoPortalData(id);
  if (!loaded) notFound();

  return (
    <AlunoPortal
      variant="admin"
      studentId={id}
      initialRow={loaded.rec}
      initialAvatarUrl={loaded.initialAvatarUrl}
      adminBackHref="/admin/alunos"
    />
  );
}
