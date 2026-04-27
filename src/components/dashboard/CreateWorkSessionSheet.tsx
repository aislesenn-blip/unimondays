"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, UploadCloud, Loader2, Edit3, CheckCircle2, Trash2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";

interface CreateWorkSessionSheetProps {
  classId: string;
}

export function CreateWorkSessionSheet({ classId }: CreateWorkSessionSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, getValues, reset, setValue, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [parsedSections, setParsedSections] = useState<any[]>([]);
  const [isRubricParsed, setIsRubricParsed] = useState(false);

  const calculateTotalMarks = (sections: any[]) => {
      let total = 0;
      sections.forEach(section => {
          section.questions?.forEach((q: any) => {
              total += Number(q.maxScore || 0);
          });
      });
      return total;
  };

  const totalCalculatedMarks = calculateTotalMarks(parsedSections);

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `rubrics/${classId}/${filename}`;

      const { error: uploadError } = await supabaseClient.storage.from('exam_pdfs').upload(filePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      toast.info("Extracting Atomic Criteria...");

      const ocrRes = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, isRubric: true }),
      });

      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.error || "Failed to extract structured text.");

      setValue("markingScheme", filePath);

      try {
         const parsed = JSON.parse(ocrData.text);
         if (Array.isArray(parsed)) {
             setParsedSections(parsed);
             setIsRubricParsed(true);
             setValue("totalMarks", calculateTotalMarks(parsed));
             toast.success("Atomic Rubric Mapped Successfully!");
         } else {
             throw new Error("Extracted format is not a JSON Array");
         }
      } catch (parseErr) {
          throw new Error("AI failed to return a strict JSON array. Please review the document.");
      }

    } catch (error: any) {
      toast.error(`Extraction Failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    setIsProcessing(true);
    try {
      if (parsedSections.length === 0) {
          toast.error("Please upload and verify a Marking Scheme before saving.");
          setIsProcessing(false);
          return;
      }

      const formValues = getValues();
      const payload = {
        ...formValues,
        rubric: JSON.stringify(parsedSections),
        totalMarks: totalCalculatedMarks,
        releaseMode: formValues.releaseMode || "MANUAL",
      };

      const res = await fetch(`/api/classes/${classId}/work-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create session');
      }

      const session = await res.json();
      toast.success(`Session ${session.workCode} created`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto w-full">
        <SheetHeader>
          <SheetTitle>Create Work Session</SheetTitle>
          <SheetDescription>
            Create a new assignment or exam. Configure the AI grading persona below.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Mid-Semester Exam" {...register("title", { required: true })} />
            {errors.title && <span className="text-sm text-destructive">Required</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-1">
              Deadline (Optional)
              <span className="text-xs text-muted-foreground ml-1 font-normal">
                (Sets the cutoff time for student submissions. It is also used to trigger automated result releases if 'Release on Deadline' mode is selected.)
              </span>
            </Label>
            <Input id="deadline" type="datetime-local" {...register("deadline")} />
          </div>

           <div className="space-y-4 border p-4 rounded-md bg-muted/30">
              <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Marking Scheme / Rubric</h3>
              </div>
              <p className="text-xs text-muted-foreground">Upload the rubric. It will be converted into Atomic Criteria for deterministic grading.</p>

              {!isRubricParsed ? (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 relative">
                          <Input type="file" onChange={handleFileProcess} accept=".pdf,.jpg,.png" disabled={uploading} />
                          {uploading && (
                              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-primary">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Extracting...
                              </div>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="space-y-3 bg-muted/10">
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-2" /> Verified Atomic Criteria</h4>
                          <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-1 rounded">Total: {totalCalculatedMarks} Marks</span>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {parsedSections.map((section, sIndex) => (
                              <div key={sIndex} className="mb-4">
                                  <div className="font-bold text-xs uppercase text-muted-foreground mb-2">Section: {section.sectionName}</div>
                                  {section.questions?.map((q: any, qIndex: number) => (
                                     <div key={qIndex} className="flex flex-col gap-2 p-3 mb-2 bg-background border rounded shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-sm">Q: {q.questionId} <span className="text-muted-foreground font-normal text-xs ml-2">({q.topic})</span></div>
                                            <div className="text-xs font-bold text-primary">{q.maxScore} Max Marks</div>
                                        </div>
                                        <div className="pl-2 border-l-2 border-muted space-y-1 mt-1">
                                            {q.criteria?.map((c: any, cIndex: number) => (
                                                <div key={cIndex} className="text-xs flex justify-between">
                                                    <span className="text-muted-foreground">• {c.text}</span>
                                                    <span className="font-mono">{c.marks}m</span>
                                                </div>
                                            ))}
                                        </div>
                                     </div>
                                  ))}
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-end mt-2 pt-2 border-t">
                          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setParsedSections([]); setIsRubricParsed(false); }}><Edit3 className="w-3 h-3 mr-1" /> Re-upload</Button>
                      </div>
                  </div>
              )}
           </div>

           <div className="space-y-2">
             <Label>Instructions to Students</Label>
             <Textarea placeholder="Instructions visible to students (e.g. 'Answer all questions', 'Time limit 1 hour'). Do NOT paste the marking scheme here." {...register("instructions")} />
           </div>

          <div className="space-y-2">
            <Label htmlFor="releaseMode">Result Release Mode</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("releaseMode")}
            >
              <option value="MANUAL">Manual Approval (Recommended)</option>
              <option value="AUTO">Auto-Release (Immediate)</option>
              <option value="DEADLINE">Release on Deadline</option>
            </select>
          </div>

          <SheetFooter>
            <SheetClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSubmitting || uploading || parsedSections.length === 0}>
              {isSubmitting ? "Creating..." : "Create Session"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
