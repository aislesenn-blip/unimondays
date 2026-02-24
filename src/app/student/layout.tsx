"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-sm bg-background/80">
        <Link href="/student/dashboard" className="text-xl font-bold tracking-tight">
          Playbook <span className="text-primary/70 font-normal">Student</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            BJ
          </div>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
             <LogOut className="mr-2 h-4 w-4" />
             Exit
          </Link>
        </div>
      </header>
      <main className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>
    </div>
  );
}
