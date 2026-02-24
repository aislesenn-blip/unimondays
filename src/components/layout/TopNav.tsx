"use client";

import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });
}

export function TopNav({ className, toggleSidebar }: { className?: string, toggleSidebar: () => void }) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className={cn("flex h-16 w-full items-center justify-between border-b bg-card px-6 py-4 backdrop-blur-sm", className)}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground">
          <span className="text-foreground font-semibold">Dashboard</span>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center">
              <span className="mx-2 text-muted-foreground/50">/</span>
              <span className={cn(
                "transition-colors hover:text-foreground cursor-pointer",
                index === breadcrumbs.length - 1 ? "text-foreground font-semibold" : ""
              )}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-64 rounded-full border border-input bg-muted pl-9 text-sm outline-none focus:ring-1 focus:ring-ring transition-all"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted" onClick={() => alert('Notifications panel coming soon')}>
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive shadow-sm animate-pulse" />
        </Button>
      </div>
    </header>
  );
}
