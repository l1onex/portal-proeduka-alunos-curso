import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getStaffSession } from "@/lib/api/staff-session";

/** Evita pré-render estático no `next build` (layout usa Supabase/cookies). */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  const displayName =
    session.email.includes("@") ? session.email.split("@")[0] : session.email;

  return (
    <div className="min-h-screen bg-[#f8fbff] lg:pl-64">
      <AdminSidebar
        role={session.role}
        userEmail={session.email}
        displayName={displayName}
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 px-4 pb-8 pt-14 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
