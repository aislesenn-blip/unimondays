"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ScriptsUsageMeter({ className }: { className?: string }) {
  // Mock data
  const used = 132;
  const limit = 200;
  const percentage = (used / limit) * 100;
  const tier = "LITE";

  return (
    <div className={`space-y-3 p-4 bg-muted/30 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usage This Month</span>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
          {tier} TIER
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm font-medium">
          <span>{used} Scripts</span>
          <span className="text-muted-foreground">/ {limit}</span>
        </div>
        <Progress value={percentage} className="h-2 bg-muted-foreground/20" />
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{limit - used} remaining</span>
        {percentage > 75 && (
          <span className="text-amber-500 font-medium">Running low</span>
        )}
      </div>

      {percentage > 60 && (
        <Button size="sm" variant="default" className="w-full h-7 text-xs gap-2 bg-gradient-to-r from-primary to-slate-800">
          <Sparkles className="h-3 w-3" />
          Upgrade Plan
        </Button>
      )}
    </div>
  );
}
