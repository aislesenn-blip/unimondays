"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SubmissionDrawerProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubmissionDrawer({ session, open, onOpenChange, onSuccess }: SubmissionDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // 1. Prepare form data for the unified endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workSessionId", session.id);

      // 2. Send to the unified /api/upload endpoint
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      toast.success("Submitted successfully! Processing has started.");
      onSuccess(); // Refresh the submission list
      onOpenChange(false);
      setFile(null);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        <div className="mx-auto w-full max-w-lg">
          <SheetHeader>
            <SheetTitle>Submit your work</SheetTitle>
            <SheetDescription>
                {session.title} • {session.lecturerName}
                <br />
                Due {new Date(session.deadline).toLocaleString()}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {session.isOverdue && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Deadline has passed. Late submissions may be penalized.
                </div>
            )}

            {session.instructions && (
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                    <div className="font-semibold mb-1">Instructions:</div>
                    {session.instructions}
                </div>
            )}

            <div className="relative border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) {
                            if (selected.size > 20 * 1024 * 1024) {
                                toast.error("File is too large. Please upload a file smaller than 20MB.");
                                e.target.value = "";
                                setFile(null);
                                return;
                            }
                            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                            if (!allowedTypes.includes(selected.type)) {
                                toast.error("Invalid file type. Only PDF, PNG, and JPG are allowed.");
                                e.target.value = "";
                                setFile(null);
                                return;
                            }
                            setFile(selected);
                        } else {
                            setFile(null);
                        }
                    }}
                />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                    {file ? (
                        <>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="font-medium text-foreground">{file.name}</div>
                                <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                <Upload className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="font-medium text-foreground">Click to Upload</div>
                                <div className="text-xs text-muted-foreground">PDF, PNG, JPG (Max 20MB)</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
          </div>

          <SheetFooter className="sm:justify-between gap-4">
             <SheetClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </SheetClose>
            <Button onClick={handleSubmit} disabled={!file || loading} className="w-full sm:w-auto">
                {loading ? "Submitting..." : "Submit Assignment"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
