"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";
import { GlobalAIAssistant } from "@/components/dashboard/GlobalAIAssistant";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  return (
    // Removed relative overflow-hidden, simplified background
    <div className="flex h-screen w-full bg-background">
      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden", // Darker overlay, added blur
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity duration-300"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar: Unchanged but its context is cleaner */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 transform bg-card transition-all duration-300 lg:static lg:transform-none border-r",
        sidebarOpen ? "translate-x-0 w-64 shadow-xl" : "-translate-x-full lg:translate-x-0",
        collapsed && isDesktop ? "lg:w-20" : "lg:w-64"
      )}>
        <DashboardSidebar
          collapsed={collapsed && isDesktop}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobile={!isDesktop}
        />
      </aside>

      {/* Main Content: Cleaner background and padding */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-background">
          {/* Consistent padding, simpler animation */}
          <div className="mx-auto max-w-7xl p-8 animate-in fade-in-50 duration-500 pb-24">
            {children}
          </div>
        </main>
      </div>

      {/* Global AI Assistant - Floating */}
      <GlobalAIAssistant />
    </div>
  );
}
