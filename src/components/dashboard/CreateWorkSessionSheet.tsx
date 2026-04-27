"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

export function CreateWorkSessionSheet({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, control, getValues, reset, setValue, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: "",
      deadline: "",
      instructions: "",
      releaseMode: "MANUAL",
      rubricItems: [] as { questionId: string; maxScore: number; rubricSegment: string }[]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rubricItems"
  });

  const rubricItems = watch("rubricItems");
  const totalCalculatedMarks = rubricItems.reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0);

  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRubricParsed, setIsRubricParsed] = useState(false);

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `rubrics/${classId}/${filename}`;

      const { error: uploadError } = await supabase.storage.from('exam_pdfs').upload(filePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      toast.info("Extracting Marking Scheme...");

      const ocrRes = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, isRubric: true }),
      });

      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.error || "Failed to extract structured text.");

      try {
         const parsed = JSON.parse(ocrData.text);
         if (Array.isArray(parsed)) {
             setValue("rubricItems", parsed);
             setIsRubricParsed(true);
             toast.success("Marking Scheme Extracted Successfully!");
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
      const items = getValues("rubricItems");
      if (!items || items.length === 0) {
          toast.error("Please provide at least one marking scheme item before saving.");
          setIsProcessing(false);
          return;
      }

      const formValues = getValues();
      const payload = {
        ...formValues,
        rubric: JSON.stringify(items),
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
      setIsRubricParsed(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
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
            </Label>
            <Input id="deadline" type="datetime-local" {...register("deadline")} />
          </div>

           <div className="space-y-4 border p-4 rounded-md bg-muted/30">
              <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Marking Scheme / Rubric</h3>
              </div>
              <p className="text-xs text-muted-foreground">Upload the rubric to auto-extract, or add items manually.</p>

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
              ) : null}

              {(isRubricParsed || fields.length > 0) && (
                  <div className="space-y-3 bg-muted/10">
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium flex items-center text-green-600">
                             <CheckCircle2 className="w-4 h-4 mr-2" /> Verified Marking Scheme
                          </h4>
                          <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-1 rounded">Total: {totalCalculatedMarks} Marks</span>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {fields.map((field, index) => (
                             <div key={field.id} className="flex flex-col gap-2 p-3 mb-2 bg-background border rounded shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Input placeholder="Q ID" className="w-24 text-sm" {...register(`rubricItems.${index}.questionId` as const)} />
                                    <div className="flex items-center gap-1">
                                        <Input type="number" step="0.5" placeholder="Score" className="w-20 text-sm" {...register(`rubricItems.${index}.maxScore` as const, { valueAsNumber: true })} />
                                        <span className="text-xs text-muted-foreground">pts</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Textarea className="min-h-[60px] text-sm" placeholder="Expected answer or rubric details..." {...register(`rubricItems.${index}.rubricSegment` as const)} />
                             </div>
                          ))}
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                          <Button type="button" variant="outline" size="sm" onClick={() => append({ questionId: "", maxScore: 0, rubricSegment: "" })}>
                              <Plus className="w-3 h-3 mr-1" /> Add Question
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setValue("rubricItems", []); setIsRubricParsed(false); }}>
                              <Edit3 className="w-3 h-3 mr-1" /> Re-upload
                          </Button>
                      </div>
                  </div>
              )}
           </div>

           <div className="space-y-2">
             <Label>Instructions to Students</Label>
             <Textarea placeholder="Instructions visible to students (e.g. 'Answer all questions', 'Time limit 1 hour')." {...register("instructions")} />
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
            <Button type="submit" disabled={isProcessing || uploading || fields.length === 0}>
              {isProcessing ? "Creating..." : "Create Session"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
