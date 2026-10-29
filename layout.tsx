import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell username={admin.username}>{children}</AdminShell>;
}
