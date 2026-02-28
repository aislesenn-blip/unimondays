"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaybookAI } from "@/components/icons/PlaybookAI";
import { StandardizedRubric } from "@/lib/ai/rubric-standardizer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function StandardizeRubricPage() {
    const router = useRouter();
    const [rawRubric, setRawRubric] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [standardizedRubric, setStandardizedRubric] = useState<StandardizedRubric | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateRubricField = (field: keyof StandardizedRubric, value: any) => {
        if (!standardizedRubric) return;
        setStandardizedRubric({ ...standardizedRubric, [field]: value });
    };

    const updateQuestionField = (qIdx: number, field: string, value: any) => {
        if (!standardizedRubric) return;
        const newQuestions = [...standardizedRubric.Questions];
        (newQuestions[qIdx] as any)[field] = value;
        setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updateConceptUnit = (qIdx: number, cIdx: number, field: string, value: any) => {
        if (!standardizedRubric) return;
        const newQuestions = [...standardizedRubric.Questions];
        (newQuestions[qIdx].ConceptUnits[cIdx] as any)[field] = value;
        setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updateEvaluationTier = (qIdx: number, tier: string, value: string) => {
        if (!standardizedRubric) return;
        const newQuestions = [...standardizedRubric.Questions];
        (newQuestions[qIdx].EvaluationTiers as any)[tier] = value;
        setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updateOutOfScope = (qIdx: number, oIdx: number, field: string, value: any) => {
         if (!standardizedRubric) return;
         const newQuestions = [...standardizedRubric.Questions];
         (newQuestions[qIdx].OutOfScope[oIdx] as any)[field] = value;
         setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updatePenalty = (qIdx: number, pIdx: number, field: string, value: any) => {
         if (!standardizedRubric) return;
         const newQuestions = [...standardizedRubric.Questions];
         (newQuestions[qIdx].Penalties[pIdx] as any)[field] = value;
         setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const handleStandardize = async () => {
        if (!rawRubric.trim()) return;
        setIsProcessing(true);
        setError(null);
        try {
            const res = await fetch("/api/rubrics/standardize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: rawRubric })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Standardization failed");
            setStandardizedRubric(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!standardizedRubric) return;
        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/rubrics/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(standardizedRubric)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            // Navigate away on success, perhaps to the list of rubrics or dashboard
            router.push("/dashboard");
        } catch (err: any) {
             setError(err.message);
        } finally {
             setIsSaving(false);
        }
    };

    if (standardizedRubric) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Review Standardized Rubric</h1>
                        <p className="text-muted-foreground mt-1">
                            The AI has parsed the rubric into atomic scoring blocks. Review and approve.
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                         <PlaybookAI className="w-4 h-4" />
                         {isSaving ? "Saving..." : "Approve & Lock Rubric"}
                    </Button>
                </div>

                {error && <div className="text-destructive font-medium bg-destructive/10 p-3 rounded">{error}</div>}

                <Card>
                    <CardHeader>
                        <CardTitle>Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Exam Title</Label>
                            <Input value={standardizedRubric.ExamTitle} onChange={(e) => updateRubricField('ExamTitle', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Course Code</Label>
                            <Input value={standardizedRubric.CourseCode} onChange={(e) => updateRubricField('CourseCode', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Exam Date</Label>
                            <Input value={standardizedRubric.ExamDate} onChange={(e) => updateRubricField('ExamDate', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Total Marks</Label>
                            <Input type="number" value={standardizedRubric.TotalMarks} onChange={(e) => updateRubricField('TotalMarks', parseFloat(e.target.value))} />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mt-8">Questions & Atomic Blocks</h2>
                    {standardizedRubric.Questions.map((q, idx) => (
                        <Card key={idx} className="border-l-4 border-l-primary">
                             <CardHeader className="pb-2">
                                 <div className="flex justify-between items-start">
                                     <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {q.QuestionID}
                                            <Badge variant="outline">{q.QuestionType}</Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-foreground font-medium">
                                            {q.QuestionText}
                                        </CardDescription>
                                     </div>
                                     <Badge className="text-sm">{q.MarksAllocated} Marks</Badge>
                                 </div>
                             </CardHeader>
                             <CardContent className="space-y-4 pt-2">
                                 {/* Concept Units */}
                                 {q.ConceptUnits && q.ConceptUnits.length > 0 && (
                                     <div className="space-y-2">
                                         <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Concept Units</h4>
                                         <div className="grid gap-2">
                                             {q.ConceptUnits.map((cu, cidx) => (
                                                 <div key={cidx} className="grid grid-cols-[1fr_auto] gap-4 items-start bg-muted/50 p-3 rounded">
                                                     <div className="space-y-2">
                                                         <div className="flex items-center gap-2">
                                                             <Badge variant="outline">{cu.ConceptID}</Badge>
                                                             <Input value={cu.ConceptText} onChange={(e) => updateConceptUnit(idx, cidx, 'ConceptText', e.target.value)} className="h-8 text-sm" />
                                                         </div>
                                                         <div className="flex items-center gap-2">
                                                             <Label className="text-xs text-muted-foreground whitespace-nowrap">Partial Rule:</Label>
                                                             <Input value={cu.PartialRule || ""} onChange={(e) => updateConceptUnit(idx, cidx, 'PartialRule', e.target.value)} className="h-7 text-xs" placeholder="e.g. 0.5 if implied" />
                                                         </div>
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                         <Input type="number" value={cu.Marks} onChange={(e) => updateConceptUnit(idx, cidx, 'Marks', parseFloat(e.target.value))} className="h-8 w-16 text-center" />
                                                         <span className="text-sm font-medium">m</span>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* Evaluation Tiers */}
                                 {q.EvaluationTiers && (
                                      <div className="space-y-2 mt-4 pt-4 border-t">
                                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Evaluation Tiers</h4>
                                          <div className="text-sm space-y-2 mt-2">
                                              <div className="flex items-start gap-2">
                                                  <span className="font-semibold text-green-600 dark:text-green-400 mt-1.5 w-14">Tier 1:</span>
                                                  <Input value={q.EvaluationTiers.Tier1} onChange={(e) => updateEvaluationTier(idx, 'Tier1', e.target.value)} className="h-8" />
                                              </div>
                                              <div className="flex items-start gap-2">
                                                  <span className="font-semibold text-blue-600 dark:text-blue-400 mt-1.5 w-14">Tier 2:</span>
                                                  <Input value={q.EvaluationTiers.Tier2} onChange={(e) => updateEvaluationTier(idx, 'Tier2', e.target.value)} className="h-8" />
                                              </div>
                                              <div className="flex items-start gap-2">
                                                  <span className="font-semibold text-red-600 dark:text-red-400 mt-1.5 w-14">Tier 3:</span>
                                                  <Input value={q.EvaluationTiers.Tier3} onChange={(e) => updateEvaluationTier(idx, 'Tier3', e.target.value)} className="h-8" />
                                              </div>
                                          </div>
                                      </div>
                                 )}

                                 {/* Out of Scope & Penalties */}
                                 {(q.OutOfScope?.length > 0 || q.Penalties?.length > 0) && (
                                     <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                                         {q.OutOfScope?.length > 0 && (
                                             <div className="space-y-2">
                                                 <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Out of Scope Rules</h4>
                                                 <div className="space-y-2">
                                                     {q.OutOfScope.map((os, oidx) => (
                                                          <div key={oidx} className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                                                              <Input value={os.Description} onChange={(e) => updateOutOfScope(idx, oidx, 'Description', e.target.value)} className="h-8 text-sm" />
                                                              <div className="flex items-center gap-1 shrink-0">
                                                                  <span className="text-xs text-muted-foreground">Max:</span>
                                                                  <Input type="number" value={os.MaxMarks} onChange={(e) => updateOutOfScope(idx, oidx, 'MaxMarks', parseFloat(e.target.value))} className="h-8 w-16 text-center text-sm" />
                                                              </div>
                                                          </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}

                                         {q.Penalties?.length > 0 && (
                                             <div className="space-y-2">
                                                 <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Penalties</h4>
                                                 <div className="space-y-2">
                                                     {q.Penalties.map((pen, pidx) => (
                                                          <div key={pidx} className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                                                              <Input value={pen.Description} onChange={(e) => updatePenalty(idx, pidx, 'Description', e.target.value)} className="h-8 text-sm" />
                                                              <div className="flex items-center gap-1 shrink-0">
                                                                  <span className="text-xs text-muted-foreground text-red-500">-</span>
                                                                  <Input type="number" value={pen.Deduct} onChange={(e) => updatePenalty(idx, pidx, 'Deduct', parseFloat(e.target.value))} className="h-8 w-16 text-center text-sm" />
                                                              </div>
                                                          </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
                                      </div>
                                 )}
                             </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Standardize Rubric</h1>
                <p className="text-muted-foreground mt-1">
                    Paste your unstructured marking scheme below. Our AI will break it down into atomic scoring blocks.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Raw Marking Scheme</CardTitle>
                    <CardDescription>Paste the text of your exam rubric or marking scheme.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="e.g. Question 1. (a) Define Photosynthesis. (2 marks). Award 1 mark for mentioning sunlight, 1 mark for converting into chemical energy..."
                        className="min-h-[300px] font-mono text-sm"
                        value={rawRubric}
                        onChange={(e) => setRawRubric(e.target.value)}
                    />
                    {error && <p className="text-destructive text-sm mt-2">{error}</p>}
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4">
                    <Button
                        onClick={handleStandardize}
                        disabled={!rawRubric.trim() || isProcessing}
                        className="gap-2"
                    >
                         <PlaybookAI className="w-4 h-4" />
                         {isProcessing ? "Standardizing Rubric into Atomic Units..." : "Standardize"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
