import { redirect } from "next/navigation";
import { AlunoSidebar } from "@/components/aluno/aluno-sidebar";
import { getStudentSession } from "@/lib/api/student-session";

/** Evita pré-render estático no `next build` (layout usa Supabase/cookies). */
export const dynamic = "force-dynamic";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();
  if (!session) {
    redirect("/login?next=/aluno");
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] lg:pl-64">
      <AlunoSidebar userEmail={session.email ?? ""} />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 px-4 pb-8 pt-14 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
