"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "@/components/dashboard/NotificationsPopover";

/**
 * Transforms a URL path segment into a human-readable title.
 * e.g., "/dashboard/work-sessions" -> "Work Sessions"
 */
function getTitleFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'Dashboard'; // Default to Dashboard
  
  // Handle special cases or just format the string
  if (lastSegment === 'dashboard') return 'Overview';

  return lastSegment
    .replace(/-/g, ' ') // a-b -> a b
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function TopNav({ className, toggleSidebar }: { className?: string, toggleSidebar: () => void }) {
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);

  return (
    // Cleaner styling: subtle border, no blur, consistent height
    <header className={cn("flex h-14 w-full items-center justify-between border-b bg-background px-4 sm:px-6", className)}>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden" // Only show on smaller screens
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page Title - The new, cleaner approach */}
        <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">
          {title}
        </h1>
      </div>

      {/* Right-aligned controls */}
      <div className="flex items-center gap-4">
        <NotificationsPopover />
        {/* UserMenu could go here in the future */}
      </div>
    </header>
  );
}
