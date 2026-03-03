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
    <div className="w-64 h-screen border-r border-slate-200 bg-white/50 backdrop-blur-xl flex flex-col p-6 sticky top-0 hidden md:flex shrink-0">
      <div className="flex items-center gap-3 px-2 mb-12">
        <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">Playbook Lite</span>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Menu</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm",
                isActive
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
             <img src="https://ui-avatars.com/api/?name=Teacher&background=random" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-slate-900">Dr. Sarah</span>
            <span className="text-xs text-slate-500">L8 Educator</span>
          </div>
        </div>
      </div>
    </div>
  );
}