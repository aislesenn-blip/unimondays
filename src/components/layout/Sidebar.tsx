"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, FolderKanban, Sparkles, LayoutDashboard } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Classes", href: "/dashboard/classes", icon: FolderKanban },
    { name: "AI Brain", href: "/dashboard/ai-brain", icon: Sparkles },
    { name: "Assignments", href: "/dashboard/assignments", icon: BookOpen },
  ];

  return (
    <div className="w-64 h-screen border-r border-border/40 bg-background/40 backdrop-blur-xl flex flex-col p-6 sticky top-0 hidden md:flex shrink-0">
      <div className="flex items-center gap-3 px-2 mb-12">
        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight">Playbook Lite</span>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        <div className="luxury-subheading mb-2 px-2">Menu</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden relative">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src="https://ui-avatars.com/api/?name=Teacher&background=random" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Dr. Sarah</span>
            <span className="text-xs text-muted-foreground">L8 Educator</span>
          </div>
        </div>
      </div>
    </div>
  );
}