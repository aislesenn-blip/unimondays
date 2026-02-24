"use client";

import { Sparkles } from "lucide-react";

export function ScriptsUsageMeter({ className }: { className?: string }) {
  // Mock data
  const used = 132;
  // limit is removed

  return (
    <div className={`space-y-3 p-4 bg-muted/30 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Scripts Processed</span>
        <Sparkles className="h-4 w-4 text-primary" />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-2xl font-bold">
          <span>{used}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Lifetime usage
      </div>
    </div>
  );
}
