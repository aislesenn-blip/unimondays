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
import { getClientGeminiKey, convertPdfToImagesClient, fileToBase64, extractStudentExamsClient, normalizeQuestionId } from "@/lib/ai/client-engine";

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
      // 1. Convert to Base64 Images Client-Side
      let base64Images: string[] = [];
      if (file.type === "application/pdf") {
          base64Images = await convertPdfToImagesClient(file);
      } else if (file.type.startsWith("image/")) {
          const b64 = await fileToBase64(file);
          base64Images.push(b64);
      } else {
          throw new Error("Invalid file type.");
      }

      // 2. Gather target questions from session rubric
      let rawTargetQuestions: string[] = [];
      try {
          if (session.rubric) {
              const parsedRubric = typeof session.rubric === 'string' ? JSON.parse(session.rubric) : session.rubric;
              if (Array.isArray(parsedRubric)) {
                  rawTargetQuestions = parsedRubric.map((item: any) => item.qId || item.questionId).filter(Boolean);
              }
          }
      } catch (e) {
          console.warn("Could not parse rubric for target questions. AI will attempt to find all standard numbers.");
          rawTargetQuestions = ["All numbered questions from the document"];
      }

      // Fallback if rubric was missing
      if (rawTargetQuestions.length === 0) rawTargetQuestions = ["All numbered questions from the document"];

      const targetQuestions = rawTargetQuestions.map((id: string) => normalizeQuestionId(id));

      // 3. Client-Side AI Extraction Call (Single-Pass Semantic Router)
      const apiKey = await getClientGeminiKey();
      const extractedTextMap = await extractStudentExamsClient(base64Images, targetQuestions, apiKey);

      // 4. Upload raw file to Supabase for storage
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `submissions/${filename}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 5. Submit Semantic JSON Map and file path to API directly
      const res = await fetch("/api/student/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extractedText: JSON.stringify(extractedTextMap), // Send the map to backend Evaluator
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
            <Button onClick={handleSubmit} disabled={!file || loading} className="w-full sm:w-auto relative">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Analyzing & Submitting...
                  </span>
                ) : "Submit Assignment"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
