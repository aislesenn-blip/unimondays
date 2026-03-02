import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 lg:p-12 relative max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
