"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function StudentNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/student/login");
        router.refresh();
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 max-w-4xl mx-auto">
        <Link href="/student" className="font-bold tracking-tight text-xl flex flex-col leading-none">
          <span>Student Portal</span>
          <span className="text-[10px] font-normal text-muted-foreground tracking-widest uppercase">By Uni Monday</span>
        </Link>
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
        </div>
      </div>
    </nav>
  );
}
