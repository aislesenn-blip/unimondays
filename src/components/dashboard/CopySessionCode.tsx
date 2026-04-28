"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopySessionCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Session code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-primary/20 bg-primary/5 w-fit">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share with Students</span>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-mono font-bold tracking-widest text-primary">{code}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
