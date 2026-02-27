"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PlaybookAI } from "@/components/icons/PlaybookAI";

export function ScriptsUsageMeter({ className }: { className?: string }) {
  const [used, setUsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setUsed(data.used);
        }
      } catch (error) {
        console.error("Failed to fetch usage", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  return (
    <div className={`space-y-3 p-4 bg-muted/30 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Scripts Processed</span>
        <PlaybookAI className="h-4 w-4 text-primary" />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-2xl font-bold">
          {loading ? (
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
             <span>{used !== null ? used : '-'}</span>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Lifetime usage
      </div>
    </div>
  );
}
