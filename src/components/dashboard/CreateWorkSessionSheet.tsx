"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, UploadCloud, Loader2, Edit3, CheckCircle2, Trash2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";

interface CreateWorkSessionSheetProps {
  classId: string;
}

interface RubricItem {
  questionId: string;
  maxScore: number;
  rubricSegment: string;
}

export function CreateWorkSessionSheet({ classId }: CreateWorkSessionSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, getValues, reset, setValue, formState: { errors } } = useForm();
  
  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [rubricItems, setRubricItems] = useState<RubricItem[]>([]);
  const [isRubricParsed, setIsRubricParsed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCalculatedMarks = rubricItems.reduce((sum, item) => sum + Number(item.maxScore), 0);

  const handleFileProcess = async (file: File) => {
    setUploading(true);
    try {
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `rubrics/${classId}/${filename}`;

      const { error: uploadError } = await supabaseClient.storage.from('exam_pdfs').upload(filePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const ocrRes = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, isRubric: true }),
      });

      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.error || "Failed to extract text from document.");

      setValue("markingScheme", filePath);
      
      try {
         const parsed = JSON.parse(ocrData.text);
         if (Array.isArray(parsed)) {
             setRubricItems(parsed);
             setIsRubricParsed(true);
             setValue("totalMarks", parsed.reduce((sum, item) => sum + Number(item.maxScore), 0));
             toast.success("Marking Scheme Extracted Successfully!");
         } else {
             throw new Error("Extracted format is not an array");
         }
      } catch (parseErr) {
          throw new Error("AI failed to return a strict JSON array. Please ensure the document is clear.");
      }

    } catch (error: any) {
      toast.error(`Extraction Failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDrop = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileProcess(e.dataTransfer.files[0]);
  };
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) handleFileProcess(e.target.files[0]);
  };

  const updateRubricItem = (index: number, field: keyof RubricItem, value: any) => {
      const newItems = [...rubricItems];
      if (field === 'maxScore') newItems[index][field] = Number(value) || 0;
      else newItems[index][field] = value as string;
      setRubricItems(newItems);
      setValue("totalMarks", newItems.reduce((sum, item) => sum + Number(item.maxScore), 0));
  };

  const removeRubricItem = (index: number) => {
      const newItems = rubricItems.filter((_, i) => i !== index);
      setRubricItems(newItems);
      setValue("totalMarks", newItems.reduce((sum, item) => sum + Number(item.maxScore), 0));
      if (newItems.length === 0) setIsRubricParsed(false);
  };

  const onFormAction = async () => {
    setIsProcessing(true);
    try {
      if (rubricItems.length === 0) {
          toast.error("Please upload and verify a Marking Scheme before saving.");
          setIsProcessing(false);
          return;
      }

      const formValues = getValues();
      const payload = {
        ...formValues,
        rubric: JSON.stringify(rubricItems), 
        totalMarks: totalCalculatedMarks,
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
      setRubricItems([]);
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
        <Button><Plus className="mr-2 h-4 w-4" />New Session</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
        <SheetHeader>
          <SheetTitle>Create Work Session</SheetTitle>
          <SheetDescription>Create a new assignment or exam and upload the marking scheme for verification.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Mid-Semester Exam" {...register("title", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-1">Deadline (Optional)</Label>
            <Input id="deadline" type="datetime-local" {...register("deadline")} />
          </div>

           <div className="space-y-4">
              <Label className="font-semibold">Marking Scheme / Rubric</Label>
              {!isRubricParsed ? (
                  <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.png" onChange={handleManualUpload} />
                      {uploading ? (
                          <div className="flex flex-col items-center justify-center space-y-3">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <p className="text-sm font-medium">Please be patient as we extract the marking scheme...</p>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center space-y-3 cursor-pointer">
                              <div className="p-3 bg-muted rounded-full"><UploadCloud className="h-6 w-6 text-muted-foreground" /></div>
                              <div>
                                  <p className="text-sm font-medium">Click or drag & drop PDF/Image here</p>
                                  <p className="text-xs text-muted-foreground mt-1">We will automatically extract the questions and max scores.</p>
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-2" /> Verified Marking Scheme</h4>
                          <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-1 rounded">Total: {totalCalculatedMarks} Marks</span>
                      </div>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {rubricItems.map((item, index) => (
                              <div key={index} className="flex gap-3 items-start p-3 bg-background border rounded shadow-sm">
                                  <div className="flex-1 space-y-2">
                                      <div className="flex gap-2">
                                          <Input value={item.questionId} onChange={(e) => updateRubricItem(index, 'questionId', e.target.value)} className="w-24 h-8 text-sm font-semibold" placeholder="Q ID" />
                                          <div className="relative w-24">
                                              <Input type="number" step="0.5" value={item.maxScore} onChange={(e) => updateRubricItem(index, 'maxScore', e.target.value)} className="pl-2 pr-8 h-8 text-sm" placeholder="Score" />
                                              <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">pts</span>
                                          </div>
                                      </div>
                                      <Textarea value={item.rubricSegment} onChange={(e) => updateRubricItem(index, 'rubricSegment', e.target.value)} className="min-h-[60px] text-xs resize-y" placeholder="Expected answer or rubric details..." />
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeRubricItem(index)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setRubricItems([...rubricItems, { questionId: `Q${rubricItems.length + 1}`, maxScore: 1, rubricSegment: "" }]); }}><Plus className="w-3 h-3 mr-1" /> Add Question</Button>
                          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setRubricItems([]); setIsRubricParsed(false); }}><Edit3 className="w-3 h-3 mr-1" /> Re-upload</Button>
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
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("releaseMode")}>
              <option value="MANUAL">Manual Approval (Recommended)</option>
              <option value="AUTO">Auto-Release (Immediate)</option>
              <option value="DEADLINE">Release on Deadline</option>
            </select>
          </div>

          <SheetFooter>
            <SheetClose asChild><Button variant="outline" type="button">Cancel</Button></SheetClose>
            <Button type="button" onClick={onFormAction} disabled={isProcessing || uploading || rubricItems.length === 0}>{isProcessing ? "Creating..." : "Create Session"}</Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
