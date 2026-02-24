"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, MessageSquare, AlertCircle, RefreshCw, CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";

export function BulkActionsBar({
  selectedCount,
  onAction
}: {
  selectedCount: number;
  onAction: (action: string) => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500 shadow-2xl">
      <div className="bg-foreground text-background rounded-full px-6 py-3 flex items-center gap-6 shadow-lg border border-white/20">

        <div className="flex items-center gap-3 border-r border-background/20 pr-4">
          <div className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs">
             {selectedCount}
          </div>
          <span className="font-medium text-sm whitespace-nowrap">Selected</span>
        </div>

        <div className="flex items-center gap-2">
           <Button
             variant="ghost"
             size="sm"
             className="text-background hover:bg-background/20 hover:text-white transition-colors h-8 px-2"
             onClick={() => onAction("reevaluate")}
           >
             <RefreshCw className="mr-2 h-3 w-3" /> Re-evaluate
           </Button>
           <Button
             variant="ghost"
             size="sm"
             className="text-background hover:bg-background/20 hover:text-white transition-colors h-8 px-2"
             onClick={() => onAction("export")}
           >
             <Download className="mr-2 h-3 w-3" /> Export
           </Button>
           <Button
             variant="ghost"
             size="sm"
             className="text-background hover:bg-background/20 hover:text-white transition-colors h-8 px-2"
             onClick={() => onAction("announce")}
           >
             <MessageSquare className="mr-2 h-3 w-3" /> Announce
           </Button>
           <Button
             variant="ghost"
             size="sm"
             className="text-background hover:bg-background/20 hover:text-white transition-colors h-8 px-2"
             onClick={() => onAction("review")}
           >
             <CheckCircle2 className="mr-2 h-3 w-3" /> Mark Reviewed
           </Button>
        </div>

        <div className="border-l border-background/20 pl-4">
           <Button
             size="sm"
             className="bg-white text-black hover:bg-gray-200 h-8 rounded-full px-4 text-xs font-bold"
             onClick={() => onAction("apply")}
           >
             Apply Actions <ChevronRight className="ml-1 h-3 w-3" />
           </Button>
        </div>
      </div>
    </div>
  );
}
