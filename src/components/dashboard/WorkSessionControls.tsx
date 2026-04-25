"use client";

import { useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, HelpCircle, Upload, RotateCw, BookOpen, CheckCircle2, FileBarChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

          // 2. Trigger server-side OCR with 'isRubric' flag to parse immediately to structured JSON
          const ocrRes = await fetch("/api/ocr/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filePath, isRubric: true }),
          });

          const ocrData = await ocrRes.json();
          if (!ocrRes.ok) {
              throw new Error(ocrData.error || "Failed to extract rubric text.");
          }

          // 3. Update Database with the structured JSON
          const res = await fetch(`/api/work-sessions/${session.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  markingScheme: filePath,
                  rubricUrl: filePath,
                  rubric: ocrData.text // Save the structured JSON string directly to the DB
              }),
          });

          if (!res.ok) throw new Error("Failed to update session with parsed rubric");

          toast.success("Marking Scheme parsed and updated successfully!");
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-medium tracking-wide -ml-2">
                            <BookOpen className="w-4 h-4 mr-2 text-primary" />
                            Playbook Marking Guide
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 border-none shadow-2xl">
                        <div className="bg-muted/30 px-6 sm:px-8 py-6 border-b">
                            <DialogHeader>
                                <DialogTitle className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">Playbook AI Marking Scheme Documentation</DialogTitle>
                                <DialogDescription className="text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                                    This documentation guides teachers on how to create and structure marking schemes so that Playbook AI can grade accurately, fairly, and deterministically. Every rubric point, mark allocation, and tier logic must be clear for the AI to function correctly.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-6 sm:p-8 space-y-10">
                            {/* Core Principles Section */}
                            <section>
                                <h3 className="text-lg sm:text-xl font-medium tracking-tight mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    1. Core Principles
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Card className="p-4 bg-background shadow-sm border-border/50">
                                        <h4 className="font-semibold text-sm mb-1">Deterministic Scoring</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">AI always grades the same answer with the same score. No improvisation or guessing beyond the rubric.</p>
                                    </Card>
                                    <Card className="p-4 bg-background shadow-sm border-border/50">
                                        <h4 className="font-semibold text-sm mb-1">Tiered Evaluation</h4>
                                        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1">
                                            <li><span className="font-medium text-foreground">Tier 1: Direct Match</span> – Exactly matches rubric point.</li>
                                            <li><span className="font-medium text-foreground">Tier 2: Equivalent</span> – Uses synonyms (Flagged as Valid).</li>
                                            <li><span className="font-medium text-foreground">Tier 3: Incorrect</span> – Out-of-Scope (Score = 0).</li>
                                        </ul>
                                    </Card>
                                    <Card className="p-4 bg-background shadow-sm border-border/50">
                                        <h4 className="font-semibold text-sm mb-1">Atomic Rubric Points</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">Each point is scored individually. Marks are pre-allocated per point and never exceed total marks.</p>
                                    </Card>
                                    <Card className="p-4 bg-background shadow-sm border-border/50">
                                        <h4 className="font-semibold text-sm mb-1">Consistency</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">AI ignores extra knowledge not in rubric. Output = structured breakdown with points scored and exact quotes.</p>
                                    </Card>
                                </div>

                                    <div className="mt-4 mb-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm text-sm text-slate-700">
                                        <p className="font-semibold text-slate-900 mb-2">Examples of 10 Different Valid Responses for Same Question</p>
                                        <p className="mb-1"><strong>Question:</strong> “Explain photosynthesis.”</p>
                                        <p className="mb-3 text-emerald-700"><strong>Rubric:</strong> Plants use sunlight to make food.</p>
                                        <p className="font-semibold mb-2">Student responses:</p>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-600 mb-3">
                                            <li>“Plants manufacture glucose using sunlight.”</li>
                                            <li>“Leaves convert light energy into chemical energy.”</li>
                                            <li>“Photosynthesis produces food from sunlight.”</li>
                                            <li>“Green plants use chlorophyll to make sugar using sunlight.”</li>
                                            <li>“Plants synthesize carbohydrates from sunlight energy.”</li>
                                            <li>“Sunlight is converted into food in plants.”</li>
                                            <li>“Through chlorophyll, plants capture sunlight to create energy-rich compounds.”</li>
                                            <li>“Sunlight drives the formation of organic molecules in leaves.”</li>
                                            <li>“Plants produce energy-rich sugars from sunlight.”</li>
                                            <li>“Glucose is synthesized in plants using light energy.”</li>
                                        </ul>
                                        <p className="text-emerald-700 font-medium mb-4">All recognized correctly by AI → Tier 2. Ensures full marks fairly.</p>

                                        <p className="font-semibold text-slate-900 mb-2">🔟 Example of Correct but Out-of-Scope Answer (Tier 3)</p>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-600 mb-2">
                                            <li>“Plants are important for oxygen production.”</li>
                                        </ul>
                                        <p className="text-amber-700 font-medium">Factually true, but does not answer photosynthesis mechanism → 0 marks. Ensures AI doesn’t reward irrelevant knowledge.</p>
                                    </div>
                            </section>

                            {/* Example Templates Section */}
                            <section>
                                <h3 className="text-lg sm:text-xl font-medium tracking-tight mb-4 flex items-center gap-2">
                                    <FileBarChart className="w-5 h-5 text-primary" />
                                    2. Example Marking Scheme Templates
                                </h3>
                                <Tabs defaultValue="essay" className="w-full">
                                    <div className="overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
                                        <TabsList className="inline-flex min-w-max bg-muted/50 mb-4 h-10 items-center justify-center rounded-md p-1 text-muted-foreground">
                                            <TabsTrigger value="essay" className="px-3">Essay / Short Answer</TabsTrigger>
                                            <TabsTrigger value="calc" className="px-3">Calculations</TabsTrigger>
                                            <TabsTrigger value="diagram" className="px-3">Diagrams</TabsTrigger>
                                            <TabsTrigger value="mcq" className="px-3">MCQs</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="essay" className="bg-muted/20 p-4 sm:p-5 rounded-lg border mt-0">
                                        <div className="font-medium text-sm mb-2 text-primary">Question: Explain the process of photosynthesis in green plants.</div>
                                        <div className="text-sm space-y-3">
                                            <div>
                                                <p className="font-semibold mb-1">Rubric Points:</p>
                                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                                    <li>Plants use sunlight <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Chlorophyll absorbs light energy <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>CO₂ and H₂O converted to glucose <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Oxygen released as by-product <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Energy stored in chemical bonds of glucose <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 2)</span></li>
                                                </ol>
                                            </div>
                                            <div className="bg-background p-3 rounded text-xs text-muted-foreground border-l-2 border-primary">
                                                <strong>Notes:</strong> Each point is atomic. Tier 2 allows synonym recognition like "synthesize carbohydrates" instead of "produce glucose." Tier 3: Mentioning plant growth without photosynthesis concept → 0 marks.
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="calc" className="bg-muted/20 p-4 sm:p-5 rounded-lg border mt-0">
                                        <div className="font-medium text-sm mb-2 text-primary">Question: Calculate the area of a triangle with base = 8 cm and height = 5 cm.</div>
                                        <div className="text-sm space-y-3">
                                            <div>
                                                <p className="font-semibold mb-1">Rubric Points:</p>
                                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                                    <li>Correct formula Area = 1/2 * base * height <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Substitutes numbers correctly <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Correct calculation Area = 20 cm² <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(2 Marks, Tier 1)</span></li>
                                                </ol>
                                            </div>
                                            <div className="bg-background p-3 rounded text-xs text-muted-foreground border-l-2 border-primary">
                                                <strong>Notes:</strong> Tier 2: If calculation logic is correct but arithmetic error → partial credit. Tier 3: Wrong formula → 0 marks.
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="diagram" className="bg-muted/20 p-4 sm:p-5 rounded-lg border mt-0">
                                        <div className="font-medium text-sm mb-2 text-primary">Question: Draw and label the structure of a leaf showing parts involved in photosynthesis.</div>
                                        <div className="text-sm space-y-3">
                                            <div>
                                                <p className="font-semibold mb-1">Rubric Points:</p>
                                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                                    <li>Correct outline of leaf <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Labels chloroplast <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Indicates stomata <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                    <li>Arrows showing sunlight/CO₂/H₂O → glucose <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(2 Marks, Tier 1)</span></li>
                                                </ol>
                                            </div>
                                            <div className="bg-background p-3 rounded text-xs text-muted-foreground border-l-2 border-primary">
                                                <strong>Notes:</strong> Tier 2: Slightly different diagram style but conveys same concept. Tier 3: Diagram unrelated to photosynthesis → 0 marks.
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="mcq" className="bg-muted/20 p-4 sm:p-5 rounded-lg border mt-0">
                                        <div className="font-medium text-sm mb-2 text-primary">Question: Which gas is released during photosynthesis? A) CO₂ B) O₂ C) N₂ D) H₂O</div>
                                        <div className="text-sm space-y-3">
                                            <div>
                                                <p className="font-semibold mb-1">Rubric Points:</p>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    <li>Correct choice = B <span className="text-xs font-mono bg-background px-1 border rounded ml-1">(1 Mark, Tier 1)</span></li>
                                                </ul>
                                            </div>
                                            <div className="bg-background p-3 rounded text-xs text-muted-foreground border-l-2 border-primary">
                                                <strong>Notes:</strong> Tier 2: N/A. Tier 3: Any other selection → 0 marks.
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Guidelines */}
                                <section>
                                    <h3 className="text-lg sm:text-xl font-medium tracking-tight mb-4">3. Upload Guidelines</h3>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                            <span><strong>File Type:</strong> PDF preferred (OCR-friendly typed text).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                            <span><strong>Structure:</strong> Each question must include Question Text, Rubric Points, Marks Allocation, and Tier Assignment.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                            <span><strong>AI Handling:</strong> AI reads holistically. Student answers are mapped to rubric points. Tiered evaluation is applied per point.</span>
                                        </li>
                                    </ul>
                                </section>

                                {/* Key Takeaways */}
                                <section>
                                    <h3 className="text-lg sm:text-xl font-medium tracking-tight mb-4">4. Key Takeaways</h3>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                            <span>Be explicit with each concept you want scored.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                            <span>The Tier system ensures synonyms are recognized, but AI will not invent marks.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                            <span>Atomic rubric points = consistency and repeatability.</span>
                                        </li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
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
                    className="border-dashed w-full sm:w-auto justify-center"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!loading}
                >
                    {loading === 'rubricUpload' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Change Marking Scheme
                </Button>

                <Button
                    variant="default"
                    size="sm"
                    className="bg-primary text-primary-foreground shadow-sm transition-all w-full sm:w-auto justify-center"
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
