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
import { supabaseClient } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";

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
      // 1. Upload to Supabase Storage (Client-side) to bypass Vercel 4.5MB payload limit
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `submissions/${filename}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Trigger server-side OCR which downloads from Supabase
      const ocrRes = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) {
        throw new Error(ocrData.error || "Failed to read document.");
      }

      const extractedText = ocrData.text;

      // 3. Submit Text and file path to API directly
      const res = await fetch("/api/student/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extractedText,
          filePath,
          workSessionId: session.id,
          filename: file.name
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Submission failed");
        return;
      }

      toast.success("Submitted! Grading is happening in the background.");

      // Grading is now reliably triggered on the server using waitUntil
      onSuccess();
      onOpenChange(false);
      setFile(null); // Reset file
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred during submission");
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

            {!file ? (
                <div className="relative border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                    <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                            const selected = e.target.files?.[0];
                            if (selected) {
                                // MANDATE 1: 20MB Limit
                                if (selected.size > 20 * 1024 * 1024) {
                                    toast.error("File is too large. Please upload a file smaller than 20MB.");
                                    e.target.value = ""; // Clear input
                                    setFile(null);
                                    return;
                                }
                                // Strict Type Check
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
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                            <Upload className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">Click to Upload</div>
                            <div className="text-xs text-muted-foreground">PDF, PNG, JPG (Max 20MB)</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="border rounded-xl p-4 bg-muted/20">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-semibold text-sm truncate" title={file.name}>{file.name}</h4>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            {!loading && (
                                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                                    Change File
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-blue-600" />
                            Hakiki Kazi Yako
                        </h4>
                        <p>
                            Tafadhali hakikisha huu ndio mtihani/kazi sahihi uliyokusudia kutuma kwa Profesa. Ukibonyeza "Submit", kazi yako itatumwa moja kwa moja kwa ukaguzi na haitaweza kubadilishwa tena.
                        </p>
                    </div>
                </div>
            )}
          </div>

          <SheetFooter className="sm:justify-between gap-4">
             <SheetClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={loading}>Cancel</Button>
            </SheetClose>
            <Button onClick={handleSubmit} disabled={!file || loading} className="w-full sm:w-auto relative bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Inatuma kwa Profesa...
                  </span>
                ) : "Submit to Professor"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
