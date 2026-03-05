"use client";

import { useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, HelpCircle, Upload, RotateCw, BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@supabase/supabase-js";

// Client-side Supabase instance for direct browser uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WorkSessionControlsProps {
  session: {
    id: string;
    strictDeadline: boolean | null;
    allowAppeals: boolean | null;
    appealDeadline: string | null;
    areGradesReleased: boolean | null;
    releaseMode: string | null;
    confidenceThreshold: number | null;
  };
}

export function WorkSessionControls({ session }: WorkSessionControlsProps) {
  const [strictDeadline, setStrictDeadline] = useState(session.strictDeadline || false);
  const [allowAppeals, setAllowAppeals] = useState(session.allowAppeals || false);
  const [appealDeadline, setAppealDeadline] = useState(session.appealDeadline ? new Date(session.appealDeadline).toISOString().slice(0, 16) : "");
  const [areGradesReleased, setAreGradesReleased] = useState(session.areGradesReleased || false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(session.confidenceThreshold || 85);
  const [loading, setLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRubricUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
          toast.error("Rubric must be a PDF file.");
          return;
      }

      setLoading('rubricUpload');
      try {
          // 1. Upload to Supabase
          const fileExt = file.name.split('.').pop();
          const fileName = `rubric_${session.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `rubrics/${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from('exam_pdfs')
              .upload(filePath, file);

          if (uploadError) throw uploadError;

          // 2. Update Database & Invalidate Cache
          const res = await fetch(`/api/work-sessions/${session.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  rubricUrl: filePath,
                  rubric: null // CRITICAL: Invalidates the OCR cache
              }),
          });

          if (!res.ok) throw new Error("Failed to update rubric URL");

          toast.success("Marking Scheme updated. The AI will use this for the next grading run.");
      } catch (error: any) {
          toast.error(`Upload failed: ${error.message}`);
      } finally {
          setLoading(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleBatchRegrade = async () => {
      if (!confirm("This will reset all current scores and re-run the AI grader against the active Marking Scheme. Continue?")) return;

      setLoading('batchRegrade');
      try {
          const res = await fetch(`/api/session/regrade`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workSessionId: session.id }),
          });

          if (!res.ok) throw new Error("Failed to initialize batch re-grade");

          toast.success("Batch re-grading initialized. Submissions are now queued.");
          setTimeout(() => window.location.reload(), 1500);
      } catch (error: any) {
          toast.error(`Action failed: ${error.message}`);
      } finally {
          setLoading(null);
      }
  };

  const updateSetting = async (key: string, value: boolean | number | string | null) => {
    setLoading(key);
    try {
      let payloadValue = value;
      // Convert date to ISO string (UTC) to handle timezones correctly
      if (key === 'appealDeadline' && typeof value === 'string' && value) {
          payloadValue = new Date(value).toISOString();
      }

      const res = await fetch(`/api/work-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: payloadValue }),
      });
      if (!res.ok) throw new Error("Update failed");

      if (key === 'strictDeadline') setStrictDeadline(value as boolean);
      if (key === 'allowAppeals') setAllowAppeals(value as boolean);
      if (key === 'appealDeadline') setAppealDeadline(value as string);
      if (key === 'areGradesReleased') setAreGradesReleased(value as boolean);
      if (key === 'confidenceThreshold') setConfidenceThreshold(value as number);

      toast.success(`${key} updated`);
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="mb-6 border-none shadow-sm bg-card/50">
      <CardContent className="p-4 flex flex-col gap-4">

        {/* Top Action Bar (Premium UX) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-medium tracking-wide">
                            <BookOpen className="w-4 h-4 mr-2 text-primary" />
                            Playbook Marking Guide
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-light tracking-tight">How Playbook Lite AI Grades</DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                Empower the AI by providing the perfect Marking Scheme. The AI relies entirely on the document you upload.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4 text-sm text-foreground/80 leading-relaxed">
                            <section>
                                <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 1. Use Typed PDFs, Not Scans</h3>
                                <p>For the Marking Scheme, always upload a digitally typed PDF (Word export). While the AI reads handwritten student exams easily, a crystal-clear typed rubric guarantees 100% accuracy in the rules it follows.</p>
                            </section>
                            <section>
                                <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 2. Explicit Point Allocations</h3>
                                <p>Do not be vague. Format your rubric strictly: <code className="bg-muted px-1.5 py-0.5 rounded">Q1(a): 2 marks for defining X. 1 mark for the formula.</code> The AI treats your rubric as a strict checklist.</p>
                            </section>
                            <section>
                                <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 3. Provide Semantic Alternatives</h3>
                                <p>The AI grades on conceptual meaning, not just exact keywords. However, if there are specific acceptable alternative answers, list them in the rubric: <code className="bg-muted px-1.5 py-0.5 rounded">(Accept: Network failure OR Poor connection)</code>.</p>
                            </section>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleRubricUpload}
                />
                <Button
                    variant="outline"
                    size="sm"
                    className="border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!loading}
                >
                    {loading === 'rubricUpload' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Change Marking Scheme
                </Button>

                <Button
                    variant="default"
                    size="sm"
                    className="bg-primary text-primary-foreground shadow-sm transition-all"
                    onClick={handleBatchRegrade}
                    disabled={!!loading || areGradesReleased}
                >
                    {loading === 'batchRegrade' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
                    Repeat Grading
                </Button>
            </div>
        </div>

        {/* Existing Settings Controls */}
        <div className="flex flex-wrap items-center gap-6 pt-1">
        {/* Strict Deadline */}
        <div className="flex items-center space-x-2">
            <Switch
                id="strict-deadline"
                checked={strictDeadline}
                onCheckedChange={(v) => updateSetting('strictDeadline', v)}
                disabled={!!loading}
            />
            <Label htmlFor="strict-deadline" className="flex items-center gap-1 cursor-pointer">
                Strict Deadline
                {loading === 'strictDeadline' && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">If enabled, submissions are blocked after the deadline. If disabled, they are marked as 'Late'.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        {/* Allow Appeals */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-4">
            <div className="flex items-center space-x-2">
                <Switch
                    id="allow-appeals"
                    checked={allowAppeals}
                    onCheckedChange={(v) => updateSetting('allowAppeals', v)}
                    disabled={!!loading}
                />
                <Label htmlFor="allow-appeals" className="flex items-center gap-1 cursor-pointer">
                    Allow Appeals
                    {loading === 'allowAppeals' && <Loader2 className="h-3 w-3 animate-spin" />}
                </Label>
            </div>
            {allowAppeals && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 w-full sm:w-auto">
                     <Label htmlFor="appeal-deadline" className="text-xs text-muted-foreground whitespace-nowrap">Until:</Label>
                     <input
                        type="datetime-local"
                        id="appeal-deadline"
                        value={appealDeadline}
                        onChange={(e) => updateSetting('appealDeadline', e.target.value)}
                        className="h-8 text-sm border rounded px-2 bg-background w-full sm:w-auto"
                     />
                </div>
            )}
        </div>

        {/* Manual Release Toggle */}
        {session.releaseMode === 'MANUAL' && (
             <div className="ml-auto flex items-center gap-4">
                 <div className="flex items-center gap-2">
                     <Badge variant={areGradesReleased ? "default" : "outline"} className={areGradesReleased ? "bg-green-600" : ""}>
                         {areGradesReleased ? "Grades Live" : "Grades Hidden"}
                     </Badge>
                 </div>
                 <Button
                    variant={areGradesReleased ? "outline" : "default"}
                    size="sm"
                    onClick={() => updateSetting('areGradesReleased', !areGradesReleased)}
                    disabled={!!loading}
                    className={!areGradesReleased ? "bg-primary animate-pulse" : ""}
                 >
                    {loading === 'areGradesReleased' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                     areGradesReleased ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                    {areGradesReleased ? "Unpublish Grades" : "Publish Grades Now"}
                 </Button>
             </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
