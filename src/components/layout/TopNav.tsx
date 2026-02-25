"use client";

import { usePathname } from "next/navigation";
import {
  Search,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "@/components/dashboard/NotificationsPopover";
import { BackButton } from "@/components/ui/back-button";

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
        <BackButton className="mr-2" />

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
        <NotificationsPopover />
      </div>
    </header>
  );
}
