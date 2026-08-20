import { getDashboardStats } from "@/lib/admin/dashboard-stats";
import { AdminDashboardHome } from "@/components/admin/admin-dashboard-home";
export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return <AdminDashboardHome stats={stats} />;
}
