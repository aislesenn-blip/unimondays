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
      // Direct Client-Side Upload
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `rubrics/${classId}/${filename}`;

      const { data, error } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(filePath, file);

      if (error) throw new Error(error.message);

      setValue(field, data.path); // Store path
      toast.success(`${field} uploaded`);
    } catch (error: any) {
      toast.error(`Failed to upload ${field}: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Construct calibration object
      const payload = {
        ...data,
        calibration: JSON.stringify({
          methodology: "Standard",
          grammar: "Ignore unless critical",
          verbosity: "Concise",
          incomplete: "Grade present work",
          custom: ""
        }) // Locked defaults
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

           {/* Gold Standard Inputs */}
           <div className="space-y-4 border p-4 rounded-md bg-muted/20">
              <h3 className="font-semibold text-sm">Gold Standard Data (Internal Only)</h3>
              <p className="text-xs text-muted-foreground">These files are used by the AI for grading and are NEVER shown to students.</p>

              <div className="space-y-2">
                <Label>Marking Scheme / Rubric (PDF/Image)</Label>
                <div className="flex items-center gap-2">
                    <Input type="file" onChange={(e) => handleFileUpload(e, "markingScheme")} accept=".pdf,.jpg,.png" disabled={uploading} />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <Input type="hidden" {...register("markingScheme")} />
                {markingSchemeUrl && <div className="text-xs text-green-600 flex items-center gap-1"><FileText className="w-3 h-3"/> Uploaded</div>}
              </div>

              <div className="space-y-2">
                <Label>Past Graded Example (Gold Standard)</Label>
                <div className="flex items-center gap-2">
                    <Input type="file" onChange={(e) => handleFileUpload(e, "goldStandardUrl")} accept=".pdf,.jpg,.png" disabled={uploading} />
                </div>
                <Input type="hidden" {...register("goldStandardUrl")} />
                {goldStandardUrl && <div className="text-xs text-green-600 flex items-center gap-1"><FileText className="w-3 h-3"/> Uploaded</div>}
              </div>
           </div>

           <div className="space-y-2">
             <Label>Instructions to Students</Label>
             <Textarea placeholder="Instructions visible to students (e.g. 'Answer all questions', 'Time limit 1 hour'). Do NOT paste the marking scheme here." {...register("instructions")} />
           </div>

           {/* Deterministic AI Transparency (The Wow Factor) */}
           <div className="space-y-4 border p-5 rounded-md bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h3 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                      v3.0 Deterministic Engine Active
                  </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  This session is powered by our locked, institutional-grade grading engine. No prompt engineering required. The engine strictly enforces a 3-Tier Semantic Logic:
              </p>
              <ul className="space-y-2 mt-2">
                  <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white mt-0.5">1.</span>
                      <span><strong className="text-emerald-600 dark:text-emerald-400">Direct Match:</strong> Exact semantic alignment with your rubric.</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white mt-0.5">2.</span>
                      <span><strong className="text-amber-600 dark:text-amber-400">Equivalent Concept:</strong> Scientifically correct alternative phrasing (Flagged for your review).</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white mt-0.5">3.</span>
                      <span><strong className="text-rose-600 dark:text-rose-400">Out of Scope:</strong> Factually true but irrelevant to the question (Zero Marks).</span>
                  </li>
              </ul>
              <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  The Marking Scheme is the Absolute Authority.
              </div>
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
