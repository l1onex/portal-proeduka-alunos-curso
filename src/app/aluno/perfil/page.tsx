import { redirect } from "next/navigation";
import { AlunoPasswordChangeForm } from "@/components/aluno/aluno-password-change-form";
import { getStudentSession } from "@/lib/api/student-session";

export default async function AlunoPerfilPage() {
  const session = await getStudentSession();
  if (!session?.email) redirect("/login?next=/aluno/perfil");

  return (
    <div className="relative mx-auto max-w-xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-48 w-48 rounded-full bg-[#F66828]/10 blur-3xl"
        aria-hidden
      />
      <AlunoPasswordChangeForm userEmail={session.email} />
    </div>
  );
}
