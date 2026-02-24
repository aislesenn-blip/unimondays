"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  BarChart2,
  FileText,
  LogOut,
  MessageSquare,
  Menu,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USERS } from "@/lib/mock-data";
import { ScriptsUsageMeter } from "@/components/dashboard/ScriptsUsageMeter";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Sessions", href: "/dashboard/sessions", icon: BookOpen },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { name: "Appeals", href: "/dashboard/appeals", icon: MessageSquare },
];

interface DashboardSidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
}

export function DashboardSidebar({ className, collapsed = false, onToggleCollapse, isMobile = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const user = USERS[0]; // Mock user

  return (
    <TooltipProvider>
      <div className={cn(
        "flex h-full flex-col border-r bg-card text-card-foreground transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        className
      )}>
        <div className={cn("flex h-16 items-center border-b px-4", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && <span className="text-xl font-bold tracking-tight">Playbook.</span>}
          {collapsed && <span className="text-xl font-bold tracking-tight">P.</span>}

          {!isMobile && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className={cn("ml-auto", collapsed && "ml-0")}>
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          {/* Scripts Usage Meter - Hidden when collapsed */}
          {!collapsed && (
            <div className="mb-6 px-1">
               <ScriptsUsageMeter />
            </div>
          )}

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              if (collapsed) {
                 return (
                   <div key={item.name} className="flex justify-center mb-1">
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center p-3 rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="sr-only">{item.name}</span>
                        </Link>
                       </TooltipTrigger>
                       <TooltipContent side="right">{item.name}</TooltipContent>
                     </Tooltip>
                   </div>
                 )
              }

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
          <div className={cn("flex items-center gap-3 mb-4", collapsed ? "justify-center" : "px-2")}>
            <img
              src={user.avatar}
              alt={user.name}
              className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
            />
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className="text-xs text-muted-foreground truncate">{user.institution}</span>
              </div>
            )}
          </div>

          <Link href="/" className={cn(
             "flex items-center gap-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors",
             collapsed ? "justify-center p-2" : "w-full px-4 py-2"
           )}>
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sign Out"}
          </Link>
        </div>
      </div>
    </TooltipProvider>
  );
}
