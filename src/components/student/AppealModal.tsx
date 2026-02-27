"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface AppealModalProps {
  submissionId: string;
  onSuccess: () => void;
  deadline?: string; // New prop for strict enforcement
}

export function AppealModal({ submissionId, onSuccess, deadline }: AppealModalProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // UTC Time check
  const isExpired = deadline ? new Date() > new Date(deadline) : false;

  if (isExpired) {
      return (
          <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
              Appeal Closed
          </Button>
      );
  }

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/student/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Appeal failed");
        return;
      }

      toast.success("Appeal submitted successfully");
      onSuccess();
      setOpen(false);
    } catch (error) {
      toast.error("Failed to submit appeal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
            variant="default"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-all"
        >
            <AlertCircle className="mr-2 h-4 w-4" />
            Request Appeal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appeal Grade</DialogTitle>
          <DialogDescription>
            Briefly explain why you believe the grading is incorrect. This will be sent to your lecturer.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Textarea
                placeholder="E.g., The AI missed my calculation on step 3..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
            />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !reason.trim()} variant="destructive">
            {loading ? "Submitting..." : "Submit Appeal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
