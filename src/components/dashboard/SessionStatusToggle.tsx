"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, ChevronDown } from "lucide-react";
// import { toast } from "@/hooks/use-toast"; // Removed due to missing module

interface SessionStatusToggleProps {
  sessionId: string;
  initialStatus: string;
}

export function SessionStatusToggle({ sessionId, initialStatus }: SessionStatusToggleProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      const updatedSession = await res.json();
      setStatus(updatedSession.status);
      router.refresh();
      // toast({ title: "Status updated", description: `Session is now ${newStatus}` });
    } catch (error) {
      console.error(error);
      // toast({ title: "Error", description: "Could not update session status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getVariant = (s: string) => {
      switch(s) {
          case 'ACTIVE': return 'default'; // primary
          case 'ARCHIVED': return 'secondary';
          case 'LOCKED': return 'destructive';
          default: return 'outline';
      }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 outline-none" disabled={loading}>
          <Badge variant={getVariant(status)} className="cursor-pointer hover:opacity-80 transition-opacity">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {status}
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
          Active
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("ARCHIVED")}>
          Archived
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("LOCKED")}>
          Locked
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
