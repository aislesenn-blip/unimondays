"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";
import { GlobalAIAssistant } from "@/components/dashboard/GlobalAIAssistant";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile state
  const [collapsed, setCollapsed] = useState(false); // Desktop state
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Auto-collapse on small desktop, expand on large
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false); // Ensure mobile menu is closed on desktop
    }
  }, [isDesktop]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 transform bg-card transition-all duration-300 lg:static lg:transform-none border-r shadow-xl lg:shadow-none",
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
        collapsed && isDesktop ? "lg:w-20" : "lg:w-64"
      )}>
        <DashboardSidebar
          collapsed={collapsed && isDesktop}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobile={!isDesktop}
        />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300">
        <TopNav toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/30">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {children}
          </div>
        </main>
      </div>

      {/* Global AI Assistant - Floating */}
      <GlobalAIAssistant />
    </div>
  );
}
