"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}>({ activeTab: "", setActiveTab: () => {} });

interface TabsProps {
  defaultValue: string;
  value?: string;
  children: React.ReactNode;
  className?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ defaultValue, value, children, className, onValueChange }: TabsProps) {
  const [internalTab, setInternalTab] = React.useState(defaultValue);

  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalTab;

  const handleTabChange = (tab: string) => {
    if (!isControlled) {
      setInternalTab(tab);
    }
    onValueChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string, children: React.ReactNode, className?: string }) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button" // Important to prevent form submission if inside a form
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string, children: React.ReactNode, className?: string }) {
  const { activeTab } = React.useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in slide-in-from-bottom-2 duration-300", className)}>
      {children}
    </div>
  );
}
