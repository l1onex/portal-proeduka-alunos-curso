import Link from "next/link";
import { redirect } from "next/navigation";
import { AlunoPortal } from "@/components/aluno/aluno-portal";
import { getStudentSession } from "@/lib/api/student-session";
import { loadAlunoPortalData } from "@/lib/load-aluno-portal-data";

export default async function AlunoValidacaoPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login?next=/aluno/validacao");

  const data = await loadAlunoPortalData(session.studentId);
  if (!data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Não foi possível carregar seu cadastro.
        <Link href="/" className="mt-4 inline-block text-[#F66828] underline">
          Início
        </Link>
      </div>
    );
  }

  return (
    <AlunoPortal
      studentId={session.studentId}
      initialRow={data.rec}
      initialAvatarUrl={data.initialAvatarUrl}
      embedStudentLayout
      studentView="validacao"
    />
  );
}
