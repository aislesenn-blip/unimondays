"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar({ className }: { className?: string }) {
  return (
    <nav className={cn("fixed top-0 left-0 right-0 z-50 h-20 border-b bg-background/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between", className)}>
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-bold tracking-tight text-foreground">
          Playbook.
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#outcomes" className="hover:text-foreground transition-colors">Outcomes</Link>
          <Link href="#students" className="hover:text-foreground transition-colors">Students</Link>
          <Link href="#partnerships" className="hover:text-foreground transition-colors">Partnerships</Link>
          <Link href="#faqs" className="hover:text-foreground transition-colors">FAQs</Link>
          <Link href="#privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
          Log In
        </Link>
        <Link href="/signup" className={cn(buttonVariants())}>
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
