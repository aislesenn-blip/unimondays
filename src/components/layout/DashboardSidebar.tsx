"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LogOut,
  ChevronLeft,
  CloudLightning,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { ScriptsUsageMeter } from "@/components/dashboard/ScriptsUsageMeter";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PlaybookAI } from "@/components/icons/PlaybookAI";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Cloud Marking", href: "/dashboard/cloud-marking", icon: CloudLightning },
  // Add more items here
];

interface DashboardSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
}

export function DashboardSidebar({ collapsed = false, onToggleCollapse, isMobile = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      window.location.href = '/login';
    });
  };

  const displayUser = user || { fullName: "Guest User", institution: "Playbook AI", avatar: "" };

  return (
    <TooltipProvider>
      <div className={cn("flex h-full flex-col bg-card text-card-foreground transition-all duration-300")}>
        
        {/* Header */}
        <header className="flex h-14 items-center border-b px-4">
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
             <PlaybookAI className="h-6 w-6" />
             {!collapsed && <span className="text-lg font-bold tracking-tight">Playbook</span>}
           </Link>
           {!isMobile && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className={cn("ml-auto h-8 w-8", collapsed && "rotate-180")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
           )}
        </header>

        {/* Main Nav (Flex-1 to take up space) */}
        <nav className="flex-1 space-y-2 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return collapsed ? (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className={cn("flex h-10 w-10 items-center justify-center rounded-lg transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.name}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.name} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer (User Area) */}
        <div className="border-t p-2">
            {!collapsed && (
                <div className="px-2 py-3">
                    <ScriptsUsageMeter />
                </div>
            )}
            <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", collapsed && "justify-center")}>
                <img src={displayUser.avatar || `https://ui-avatars.com/api/?name=${displayUser.fullName}&background=random`} alt={displayUser.fullName || ''} className="h-8 w-8 rounded-full object-cover shrink-0"/>
                {!collapsed && (
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{displayUser.fullName}</span>
                    <span className="text-xs text-muted-foreground truncate">{displayUser.institution}</span>
                </div>
                )}
            </div>
            <button onClick={handleLogout} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive", collapsed && "justify-center")}>
                <LogOut className="h-4 w-4" />
                {!collapsed && "Sign Out"}
            </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
