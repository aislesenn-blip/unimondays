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
import { Plus, Upload, FileText, Loader2, Save } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";

interface CreateWorkSessionSheetProps {
  classId: string;
}

export function CreateWorkSessionSheet({ classId }: CreateWorkSessionSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm();
  const [uploading, setUploading] = useState(false);

  const rubricUrl = watch("rubricUrl");
  const markingSchemeUrl = watch("markingScheme"); // This is actually a URL now
  const goldStandardUrl = watch("goldStandardUrl");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload to Supabase Storage (Client-side) to bypass Vercel 4.5MB payload limit
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `rubrics/${classId}/${filename}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Trigger server-side OCR with 'isRubric' flag to force highly structured JSON parsing
      const isRubric = field === "markingScheme";
      const ocrRes = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, isRubric }),
      });

      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) {
        throw new Error(ocrData.error || "Failed to extract text from document.");
      }

      // Store the Supabase URL in the main field (so we don't crash the DB string limits)
      setValue(field, filePath);

      // If it's a rubric, store the parsed JSON in a hidden secondary field or directly in state
      if (isRubric) {
          setValue('parsedRubricJson', ocrData.text);
      }

      toast.success(`${field} extracted successfully`);
    } catch (error: any) {
      toast.error(`Failed to process ${field}: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Construct calibration object
      const calibration = {
        methodology: data.cal_methodology,
        grammar: data.cal_grammar,
        verbosity: data.cal_verbosity,
        incomplete: data.cal_incomplete,
        custom: data.cal_custom
      };

      const payload = {
        ...data,
        rubric: data.parsedRubricJson || null, // Send the JSON separately
        calibration: JSON.stringify(calibration),
        saveAsDefault: data.saveAsDefault
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

           {/* Gold Standard Marking Scheme Upload */}
           <div className="space-y-4 border p-4 rounded-md bg-muted/20">
              <h3 className="font-semibold text-sm">Marking Scheme Data</h3>
              <p className="text-xs text-muted-foreground">Upload the rubric. The AI will parse it into a strict JSON structure. You MUST verify it before saving.</p>

              <div className="space-y-2">
                <Label>Marking Scheme / Rubric (PDF/Image)</Label>
                <div className="flex items-center gap-2 relative">
                    <Input type="file" onChange={(e) => handleFileUpload(e, "markingScheme")} accept=".pdf,.jpg,.png" disabled={uploading} />
                    {uploading && (
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
                <Input type="hidden" {...register("markingScheme")} />
                {markingSchemeUrl && <div className="text-xs text-green-600 flex items-center gap-1"><FileText className="w-3 h-3"/> Uploaded successfully</div>}
              </div>

              <div className="space-y-2 pt-2">
                 <Label className="text-xs font-semibold text-destructive">Visual Verification (Mandatory)</Label>
                 <p className="text-[10px] text-muted-foreground mb-1">Please verify the AI parsed the exact marks correctly. Edit if needed before creating the session.</p>
                 <Textarea
                     {...register("parsedRubricJson")}
                     className="font-mono text-xs h-40 bg-black text-green-400"
                     placeholder="[ { 'questionId': 'Q1', 'maxScore': 10, 'rubricSegment': 'Award 5 marks for...' } ]"
                 />
              </div>
           </div>

           <div className="space-y-2">
             <Label>Instructions to Students</Label>
             <Textarea placeholder="Instructions visible to students (e.g. 'Answer all questions', 'Time limit 1 hour'). Do NOT paste the marking scheme here." {...register("instructions")} />
           </div>

          <div className="space-y-2">
            <Label htmlFor="totalMarks">Total Marks</Label>
            <Input id="totalMarks" type="number" defaultValue={100} {...register("totalMarks")} />
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
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? "Creating..." : "Create Session"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
