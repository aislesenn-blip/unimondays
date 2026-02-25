import { DashboardShell } from "@/components/layout/DashboardShell";
import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const user = await validateRequest();

  if (!user) {
    const cookieStore = await cookies();
    // LOOP PROTECTION:
    // If we have a session cookie but validation failed (orphaned user),
    // redirect to the error page instead of /login to prevent infinite loops.
    // (Middleware redirects /login -> /dashboard if cookie exists)
    if (cookieStore.has('auth-session')) {
        redirect('/auth-error');
    }

    redirect('/login');
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}
