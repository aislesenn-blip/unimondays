import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Global dashboard protection:
  // Redirect orphaned users (valid session cookie but missing in DB) with error param
  // to break potential middleware redirect loops.
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?error=orphaned");
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}
