
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserAccountNav } from "@/components/layout/UserAccountNav";
import { MainNav } from "@/components/layout/MainNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userProfile = {
      name: user.user_metadata.full_name || user.email,
      email: user.email,
      image: user.user_metadata.avatar_url
  }

  return (
    <DashboardShell 
      nav={<MainNav />} 
      userNav={<UserAccountNav user={userProfile} />}>
      {children}
    </DashboardShell>
  );
}
