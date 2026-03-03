"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StandardizedRubric } from "@/lib/ai/rubric-standardizer";
import { Loader2, CheckCircle2, Lock, ChevronRight, Edit2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function StandardizeRubricPage() {
    const router = useRouter();
    const [standardizedRubric, setStandardizedRubric] = useState<StandardizedRubric | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Hydrate from session storage
        const storedRubric = sessionStorage.getItem("pendingStandardizedRubric");
        if (storedRubric) {
            try {
                const parsed = JSON.parse(storedRubric);

                // Safely normalize AI JSON casing mismatches (e.g., questions vs Questions)
                const normalizeRubric = (data: any): StandardizedRubric => {
                    return {
                        ExamTitle: data.ExamTitle || data.examTitle || data.exam_title || "Untitled Exam",
                        CourseCode: data.CourseCode || data.courseCode || data.course_code || "N/A",
                        ExamDate: data.ExamDate || data.examDate || data.exam_date || new Date().toISOString(),
                        TotalMarks: Number(data.TotalMarks ?? data.totalMarks ?? data.total_marks ?? 0),
                        NumberOfQuestions: Number(data.NumberOfQuestions ?? data.numberOfQuestions ?? data.number_of_questions ?? 0),
                        Questions: Array.isArray(data.Questions || data.questions) ? (data.Questions || data.questions).map((q: any) => ({
                            QuestionID: q.QuestionID || q.questionId || q.question_id || "",
                            QuestionText: q.QuestionText || q.questionText || q.question_text || "",
                            MarksAllocated: Number(q.MarksAllocated ?? q.marksAllocated ?? q.marks_allocated ?? 0),
                            QuestionType: q.QuestionType || q.questionType || q.question_type || "Essay",
                            LearningObjective: q.LearningObjective || q.learningObjective || q.learning_objective || "",
                            ConceptUnits: Array.isArray(q.ConceptUnits || q.conceptUnits || q.concept_units) ? (q.ConceptUnits || q.conceptUnits || q.concept_units).map((cu: any) => ({
                                ConceptID: cu.ConceptID || cu.conceptId || cu.concept_id || "",
                                ConceptText: cu.ConceptText || cu.conceptText || cu.concept_text || "",
                                Marks: Number(cu.Marks ?? cu.marks ?? 0),
                                PartialRule: cu.PartialRule || cu.partialRule || cu.partial_rule || null,
                            })) : [],
                            EvaluationTiers: {
                                Tier1: q.EvaluationTiers?.Tier1 || q.evaluationTiers?.tier1 || q.evaluation_tiers?.tier1 || q.EvaluationTiers?.tier1 || "",
                                Tier2: q.EvaluationTiers?.Tier2 || q.evaluationTiers?.tier2 || q.evaluation_tiers?.tier2 || q.EvaluationTiers?.tier2 || "",
                                Tier3: q.EvaluationTiers?.Tier3 || q.evaluationTiers?.tier3 || q.evaluation_tiers?.tier3 || q.EvaluationTiers?.tier3 || "",
                            },
                            OutOfScope: Array.isArray(q.OutOfScope || q.outOfScope || q.out_of_scope) ? (q.OutOfScope || q.outOfScope || q.out_of_scope).map((os: any) => ({
                                Description: os.Description || os.description || "",
                                MaxMarks: Number(os.MaxMarks ?? os.maxMarks ?? os.max_marks ?? 0),
                            })) : [],
                            Penalties: Array.isArray(q.Penalties || q.penalties) ? (q.Penalties || q.penalties).map((p: any) => ({
                                Description: p.Description || p.description || "",
                                Deduct: Number(p.Deduct ?? p.deduct ?? 0),
                            })) : [],
                            MCQOptions: Array.isArray(q.MCQOptions || q.mcqOptions || q.mcq_options) ? (q.MCQOptions || q.mcqOptions || q.mcq_options).map((o: any) => ({
                                Option: o.Option || o.option || "",
                                Correct: Boolean(o.Correct ?? o.correct ?? false),
                                Marks: Number(o.Marks ?? o.marks ?? 0),
                            })) : []
                        })) : []
                    };
                };

                setStandardizedRubric(normalizeRubric(parsed));
            } catch (e) {
                console.error("Failed to parse stored rubric", e);
                setError("Failed to load rubric data. Please try the upload step again.");
            }
        } else {
            // No rubric in memory, likely a direct navigation.
            setError("No pending rubric found. Please start from the upload process.");
        }
        setIsLoading(false);
    }, []);

    const updateConceptUnit = (qIdx: number, cIdx: number, field: string, value: any) => {
        if (!standardizedRubric) return;
        const newQuestions = [...standardizedRubric.Questions];
        const updatedQuestion = { ...newQuestions[qIdx] };
        const updatedConceptUnits = [...updatedQuestion.ConceptUnits];
        updatedConceptUnits[cIdx] = { ...updatedConceptUnits[cIdx], [field]: value };
        updatedQuestion.ConceptUnits = updatedConceptUnits;
        newQuestions[qIdx] = updatedQuestion;
        setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updateEvaluationTier = (qIdx: number, tier: string, value: string) => {
        if (!standardizedRubric) return;
        const newQuestions = [...standardizedRubric.Questions];
        const updatedQuestion = { ...newQuestions[qIdx] };
        const updatedEvaluationTiers = { ...updatedQuestion.EvaluationTiers };
        (updatedEvaluationTiers as any)[tier] = value;
        updatedQuestion.EvaluationTiers = updatedEvaluationTiers;
        newQuestions[qIdx] = updatedQuestion;
        setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updateOutOfScope = (qIdx: number, oIdx: number, field: string, value: any) => {
         if (!standardizedRubric) return;
         const newQuestions = [...standardizedRubric.Questions];
         const updatedQuestion = { ...newQuestions[qIdx] };
         const updatedOutOfScope = [...updatedQuestion.OutOfScope];
         updatedOutOfScope[oIdx] = { ...updatedOutOfScope[oIdx], [field]: value };
         updatedQuestion.OutOfScope = updatedOutOfScope;
         newQuestions[qIdx] = updatedQuestion;
         setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const updatePenalty = (qIdx: number, pIdx: number, field: string, value: any) => {
         if (!standardizedRubric) return;
         const newQuestions = [...standardizedRubric.Questions];
         const updatedQuestion = { ...newQuestions[qIdx] };
         const updatedPenalties = [...updatedQuestion.Penalties];
         updatedPenalties[pIdx] = { ...updatedPenalties[pIdx], [field]: value };
         updatedQuestion.Penalties = updatedPenalties;
         newQuestions[qIdx] = updatedQuestion;
         setStandardizedRubric({ ...standardizedRubric, Questions: newQuestions });
    };

    const handleApproveAndLock = async () => {
        if (!standardizedRubric) return;

        // Frontend Guardrail (UI): Check that every question has a valid mark > 0
        for (const [index, q] of standardizedRubric.Questions.entries()) {
            const marks = Number(q.MarksAllocated);
            if (q.MarksAllocated === undefined || isNaN(marks) || marks <= 0) {
                toast.error(`Validation Error: Question ${q.QuestionID || index + 1} is missing allocated marks.`);
                return;
            }
        }

        setIsSaving(true);
        setError(null);
        try {
            // First we save the rubric
            const res = await fetch("/api/rubrics/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(standardizedRubric)
            });
            const data = await res.json();
            if (!res.ok) {
                // Throwing immediately aborts the success flow
                throw new Error(data.error || "Save failed");
            }

            // Store the approved rubric ID for the caller
            const sessionKey = sessionStorage.getItem("rubricSessionKey") || "approvedRubricId";
            sessionStorage.setItem(sessionKey, data.rubricId);
            sessionStorage.removeItem("rubricSessionKey");
            sessionStorage.removeItem("pendingStandardizedRubric");

            // Clean up legacy keys just in case
            sessionStorage.removeItem("pendingBulkSessionPayload");
            sessionStorage.removeItem("pendingNormalSessionPayload");

            const returnUrl = sessionStorage.getItem("rubricReturnUrl") || "/dashboard";
            router.push(returnUrl);

        } catch (err: any) {
             console.error("[STANDARDIZE] Failed to approve and lock rubric:", err);
             setError(err.message);
             toast.error(`Error saving rubric: ${err.message}`);
        } finally {
             setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading Marking Scheme...</p>
            </div>
        );
    }

    if (error && !standardizedRubric) {
        return (
             <div className="max-w-xl mx-auto py-12 text-center space-y-4">
                 <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                     {error}
                 </div>
                 <Button variant="outline" onClick={() => router.push('/dashboard/cloud-marking')}>
                     Return to Upload
                 </Button>
             </div>
        );
    }

    if (!standardizedRubric) return null;

    return (
        <div className="max-w-4xl mx-auto py-8 pb-32 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Funnel Step Indication */}
            <div className="flex flex-col items-center justify-center text-center space-y-2 mb-10">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                    <span>1. Upload</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-primary font-bold">2. Review & Approve</span>
                    <ChevronRight className="w-4 h-4" />
                    <span>3. Grade</span>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Smart Marking Scheme Extracted
                </h1>
                <p className="text-slate-500 max-w-lg">
                    We've converted your document into atomic scoring blocks. Review the logic below. Click any text to edit if needed.
                </p>
                {error && <p className="text-destructive font-medium mt-2">{error}</p>}
            </div>

            {/* Read-Only Document View */}
            <div className="space-y-6">
                {(() => {
                    try {
                        return standardizedRubric.Questions.map((q, qIdx) => (
                            <Card key={qIdx} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md bg-white dark:bg-slate-950">
                                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                     <div className="flex items-baseline gap-3">
                                         <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                             Question {q.QuestionID}
                                         </h2>
                                         <span className="text-sm font-medium text-slate-500">
                                             [{q.MarksAllocated} marks]
                                         </span>
                                     </div>
                                </div>

                                <CardContent className="p-6 space-y-8">

                                    {/* Concept Units */}
                                    {q.ConceptUnits && q.ConceptUnits.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Required Concepts</h3>
                                            <div className="space-y-3">
                                                {q.ConceptUnits.map((cu: any, cIdx: number) => (
                                                    <div key={cIdx} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 pl-4 border-l-2 border-primary/20">
                                                        <div className="flex-1">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <span className="text-base text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-1 -ml-1 rounded transition-colors group">
                                                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{cu.ConceptID}:</span> {cu.ConceptText}
                                                                        <Edit2 className="w-3 h-3 inline ml-2 opacity-0 group-hover:opacity-50" />
                                                                    </span>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80">
                                                                    <div className="space-y-2">
                                                                        <label className="text-xs font-medium">Edit Concept Text</label>
                                                                        <Textarea
                                                                            value={cu.ConceptText}
                                                                            onChange={(e) => updateConceptUnit(qIdx, cIdx, 'ConceptText', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>

                                                            {cu.PartialRule && (
                                                                <div className="mt-1">
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <span className="text-sm italic text-slate-500 cursor-pointer hover:bg-slate-50 px-1 -ml-1 rounded">
                                                                                Partial Rule: {cu.PartialRule}
                                                                            </span>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-80">
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-medium">Edit Partial Rule</label>
                                                                                <Input
                                                                                    value={cu.PartialRule}
                                                                                    onChange={(e) => updateConceptUnit(qIdx, cIdx, 'PartialRule', e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
                                                            +{cu.Marks} marks
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Evaluation Tiers */}
                                    {q.EvaluationTiers && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semantic Fallbacks (Tiers)</h3>
                                            <div className="grid sm:grid-cols-3 gap-4">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div className="p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 rounded-md cursor-pointer hover:border-green-300 transition-colors">
                                                            <div className="text-xs font-bold text-green-700 dark:text-green-500 mb-1">Tier 1 (Direct Match)</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400">{q.EvaluationTiers.Tier1}</div>
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium">Edit Tier 1</label>
                                                            <Textarea value={q.EvaluationTiers.Tier1} onChange={(e) => updateEvaluationTier(qIdx, 'Tier1', e.target.value)} />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-md cursor-pointer hover:border-amber-300 transition-colors">
                                                            <div className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-1">Tier 2 (Equivalent Concept)</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400">{q.EvaluationTiers.Tier2}</div>
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium">Edit Tier 2</label>
                                                            <Textarea value={q.EvaluationTiers.Tier2} onChange={(e) => updateEvaluationTier(qIdx, 'Tier2', e.target.value)} />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-md cursor-pointer hover:border-red-300 transition-colors">
                                                            <div className="text-xs font-bold text-red-700 dark:text-red-500 mb-1">Tier 3 (Out of Scope)</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400">{q.EvaluationTiers.Tier3}</div>
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium">Edit Tier 3</label>
                                                            <Textarea value={q.EvaluationTiers.Tier3} onChange={(e) => updateEvaluationTier(qIdx, 'Tier3', e.target.value)} />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    )}

                                    {/* Out of Scope & Penalties */}
                                    {(q.OutOfScope?.length > 0 || q.Penalties?.length > 0) && (
                                        <div className="grid sm:grid-cols-2 gap-8">
                                            {q.OutOfScope?.length > 0 && (
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Out of Scope Rules</h3>
                                                    <ul className="space-y-2">
                                                        {q.OutOfScope.map((os: any, oIdx: number) => (
                                                            <li key={oIdx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                                <span className="text-rose-500 mt-0.5">•</span>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <span className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-1 -ml-1 rounded inline-block">
                                                                            {os.Description} <span className="font-semibold ml-1">(Max {os.MaxMarks}m)</span>
                                                                        </span>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent>
                                                                        <div className="space-y-4">
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-medium">Edit Rule</label>
                                                                                <Textarea value={os.Description} onChange={(e) => updateOutOfScope(qIdx, oIdx, 'Description', e.target.value)} />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-medium">Max Marks</label>
                                                                                <Input type="number" value={os.MaxMarks} onChange={(e) => updateOutOfScope(qIdx, oIdx, 'MaxMarks', parseFloat(e.target.value))} />
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {q.Penalties?.length > 0 && (
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Penalties</h3>
                                                    <ul className="space-y-2">
                                                        {q.Penalties.map((pen: any, pIdx: number) => (
                                                            <li key={pIdx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                                <span className="text-rose-500 mt-0.5">-</span>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <span className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-1 -ml-1 rounded inline-block">
                                                                            {pen.Description} <span className="font-semibold text-rose-600 dark:text-rose-400 ml-1">(-{pen.Deduct}m)</span>
                                                                        </span>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent>
                                                                        <div className="space-y-4">
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-medium">Edit Penalty</label>
                                                                                <Textarea value={pen.Description} onChange={(e) => updatePenalty(qIdx, pIdx, 'Description', e.target.value)} />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-medium">Deduction</label>
                                                                                <Input type="number" value={pen.Deduct} onChange={(e) => updatePenalty(qIdx, pIdx, 'Deduct', parseFloat(e.target.value))} />
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </CardContent>
                            </Card>
                        ));
                    } catch (renderError: any) {
                        return (
                            <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                                <h3 className="font-bold mb-2">Error Displaying Rubric</h3>
                                <p>Failed to render questions due to a data format issue: {renderError.message}</p>
                            </div>
                        );
                    }
                })()}
            </div>

            {/* Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex justify-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <Button
                    size="lg"
                    className="w-full max-w-md h-14 text-lg font-bold shadow-xl shadow-primary/20 gap-2"
                    onClick={handleApproveAndLock}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Lock className="h-5 w-5" />
                    )}
                    {isSaving ? "Locking Rules..." : "Approve & Lock Rubric"}
                </Button>
            </div>
        </div>
    );
}
