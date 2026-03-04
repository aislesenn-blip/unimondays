import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BookOpen, Home, Layers } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex gap-6 md:gap-10">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="inline-block font-bold">Playbook</span>
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/dashboard"
                className="flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/classes"
                className="flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Classes
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1">
              <UserButton afterSignOutUrl="/" />
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
