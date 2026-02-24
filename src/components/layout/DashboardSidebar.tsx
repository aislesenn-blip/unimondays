"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  BarChart2,
  FileText,
  Settings,
  LogOut,
  Download,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USERS } from "@/lib/mock-data";
import { ScriptsUsageMeter } from "@/components/dashboard/ScriptsUsageMeter";

const NAV_ITEMS = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Sessions", href: "/dashboard/sessions", icon: BookOpen },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { name: "Appeals", href: "/dashboard/appeals", icon: MessageSquare },
  { name: "Exports", href: "/dashboard/exports", icon: Download },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const user = USERS[0]; // Mock user

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-card text-card-foreground", className)}>
      <div className="flex h-16 items-center px-6 border-b">
        <span className="text-xl font-bold tracking-tight">Playbook.</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        {/* Scripts Usage Meter */}
        <div className="mb-6">
           <ScriptsUsageMeter />
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 px-2 mb-4">
          <img
            src={user.avatar}
            alt={user.name}
            className="h-10 w-10 rounded-full object-cover border border-border"
          />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.institution}</span>
          </div>
        </div>

        <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
