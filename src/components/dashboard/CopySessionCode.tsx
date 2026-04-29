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
    <div
        className="flex items-center justify-between gap-4 p-3 pr-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors group w-fit"
        onClick={handleCopy}
    >
      <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Share with Students</span>
          <span className="text-3xl font-mono font-bold tracking-[0.2em] text-primary leading-none group-hover:scale-105 transition-transform origin-left">{code}</span>
      </div>
      <div className={`p-2 rounded-full transition-colors ${copied ? 'bg-green-100' : 'bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground'}`}>
        {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-primary group-hover:text-current" />}
      </div>
    </div>
  );
}
