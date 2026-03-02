"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-muted/20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-white to-purple-50/20 dark:from-slate-900 dark:via-background dark:to-indigo-950/40 pointer-events-none -z-10" />

      <Sidebar />

      <main className="flex-1 flex flex-col w-full relative">
        <header className="h-20 flex items-center px-8 sm:px-12 backdrop-blur-md border-b border-border/40 sticky top-0 z-10 bg-background/60">
           <h1 className="text-2xl font-bold tracking-tight text-foreground/90 capitalize">{pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</h1>
        </header>

        <div className="p-8 sm:p-12 w-full max-w-[1600px] mx-auto flex-1">
          {children}
        </div>
      </main>

      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}