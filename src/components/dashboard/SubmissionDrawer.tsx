'use client';

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, FileText, Download, Loader2, AlertTriangle, AlertCircle, ShieldCheck, ShieldAlert, SearchCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { updateSubmissionGrade } from "@/app/dashboard/work-sessions/[id]/actions";

interface SubmissionDrawerProps {
  submission: any; // Ideally typed, but 'any' for speed/parsing
}

export function SubmissionDrawer({ submission }: SubmissionDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScore, setEditedScore] = useState(submission.score?.totalMarks || 0);
  const [editedRemarks, setEditedRemarks] = useState(submission.score?.remarks || "");
  const [isPending, startTransition] = useTransition();

  // Parsing JSON fields if they are strings
  let feedback: any = {};
  let breakdown: any[] = [];
  let appealReason: string | null = null;

  try {
      feedback = typeof submission.feedback === 'string' ? JSON.parse(submission.feedback) : (submission.feedback || {});
  } catch (e) { console.warn("Failed to parse feedback JSON", e); }

  try {
      breakdown = submission.score?.breakdown
        ? (typeof submission.score.breakdown === 'string' ? JSON.parse(submission.score.breakdown) : submission.score.breakdown)
        : [];
      if (!Array.isArray(breakdown)) breakdown = [];
  } catch (e) { console.warn("Failed to parse breakdown JSON", e); }

  if (submission.status === 'APPEALED' && submission.appeals?.length > 0) {
      const pending = submission.appeals.find((a: any) => a.status === 'PENDING');
      if (pending) appealReason = pending.reason;
  }

  const handleSave = () => {
      startTransition(async () => {
          const result = await updateSubmissionGrade(
              submission.id,
              submission.workSessionId,
              parseInt(editedScore, 10),
              editedRemarks
          );

          if (result.success) {
              toast.success("Grade Calibrated Successfully");
              setIsEditing(false);
              // A full reload is okay here as it ensures all derived data is fresh.
              window.location.reload();
          } else {
              toast.error(result.error || "Failed to update grade");
          }
      });
  };
  
  const certainty = submission.confidenceScore || 0;
  const isHighCertainty = certainty >= 80;
  const isMediumCertainty = certainty >= 50 && certainty < 80;
  const certaintyColor = isHighCertainty ? "bg-green-500" : isMediumCertainty ? "bg-blue-500" : "bg-slate-400";
  const certaintyLabel = isHighCertainty ? "High Certainty" : isMediumCertainty ? "Medium Certainty" : "Low Certainty";

  const getStatusBadge = () => {
    switch (submission.status) {
      case 'GRADED':
      case 'RELEASED':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Graded</Badge>;
      case 'FLAGGED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200"><SearchCheck className="h-3 w-3 mr-1.5" />Review Suggested</Badge>;
      case 'APPEALED':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">Appeal Pending</Badge>;
      default:
        return <Badge variant="outline">{submission.status}</Badge>;
    }
  };


  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Submission Details</SheetTitle>
          <SheetDescription className="font-medium text-foreground">
            {submission.score?.detectedIdentity || submission.studentName || submission.studentRegNo || 'Unknown Student'}
          </SheetDescription>
          {(submission.studentRegNo || submission.user?.email) && (
             <p className="text-xs text-muted-foreground">
                {submission.studentRegNo || submission.user?.email}
             </p>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6">
            {submission.status === 'APPEALED' && appealReason && (
                <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-900">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-800 font-bold">Grade Appeal Pending</AlertTitle>
                    <AlertDescription className="mt-2 text-sm leading-relaxed">
                        <span className="font-semibold block mb-1">Student's Reason:</span>
                        "{appealReason}"
                        <div className="mt-3 text-xs text-orange-700/80">
                            Adjust the grade below to resolve this appeal automatically.
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground">Total Score</div>
                         {isEditing ? (
                             <div className="flex items-center gap-2 mt-1">
                                 <Input
                                     type="number"
                                     value={editedScore}
                                     onChange={(e) => setEditedScore(e.target.value)}
                                     className="w-24 h-9 bg-background"
                                 />
                                 <span className="text-sm text-muted-foreground">/ {submission.workSession?.totalMarks}</span>
                             </div>
                         ) : (
                            <div className="text-2xl font-bold">
                                {submission.score?.totalMarks || 0}
                                <span className="text-sm text-muted-foreground font-normal"> / {submission.workSession?.totalMarks}</span>
                            </div>
                         )}
                    </div>
                    <div className="flex items-center gap-2">
                         {!isEditing && (
                             <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                 Manual Calibration
                             </Button>
                         )}
                         {getStatusBadge()}
                    </div>
                </div>

                {submission.status !== 'PENDING' && (
                     <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/50 border-l-4 border-primary rounded border p-3 shadow-sm">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                 {isHighCertainty ? <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> : <ShieldAlert className="h-3.5 w-3.5 text-blue-500" />}
                                 AI Certainty: <span className="text-foreground font-bold">{Math.round(certainty)}% Match</span>
                             </span>
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isHighCertainty ? "bg-green-100 text-green-700" : isMediumCertainty ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                                 {certaintyLabel}
                             </span>
                         </div>
                         <Progress value={certainty} className="h-1.5" indicatorColor={certaintyColor} />
                     </div>
                )}

                {isEditing && (
                    <div className="space-y-2 border-t pt-4 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-sm font-medium">Lecturer Remarks</label>
                        <Textarea
                            value={editedRemarks}
                            onChange={(e) => setEditedRemarks(e.target.value)}
                            placeholder="Enter remarks for this calibration..."
                            className="bg-background min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isPending}>Cancel</Button>
                            <Button size="sm" onClick={handleSave} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Adjustment
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            
            {breakdown.some((i: any) => i.review_flag || i.alternative_valid_concept) && (
                <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                    <SearchCheck className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-bold">AI Flagged for Review</AlertTitle>
                    <AlertDescription className="mt-2 text-sm leading-relaxed">
                        The AI detected alternative valid concepts or low certainty on specific questions. Please review the highlighted questions below.
                    </AlerDescription>
                </Alert>
            )}

            {/* ... rest of the component remains the same ... */}
            <div className="space-y-3">
                 {submission.filePath && (
                    <div>
                        <h3 className="text-sm font-medium mb-2">Original Script</h3>
                        <div className="flex gap-2">
                            <a
                                href={`/api/download?url=${encodeURIComponent(submission.filePath)}&inline=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center p-3 border rounded-md hover:bg-accent transition-colors"
                            >
                                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="text-sm">View Document</span>
                            </a>
                            <a
                                href={`/api/download?url=${encodeURIComponent(submission.filePath)}`}
                                download
                                className="flex-1 flex items-center justify-center p-3 border rounded-md hover:bg-accent transition-colors"
                            >
                                <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Download</span>
                            </a>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className="space-y-3 border border-indigo-100 bg-indigo-50/30 p-4 rounded-md shadow-sm">
                        <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                            Playbook AI Insights
                        </h3>
                        {feedback.strengths?.length > 0 && (
                            <div className="text-sm">
                                <span className="font-semibold text-green-600">Strengths:</span> {feedback.strengths.join(", ")}
                            </div>
                        )}
                        {feedback.weaknesses?.length > 0 && (
                            <div className="text-sm">
                                <span className="font-semibold text-amber-600">Weaknesses:</span> {feedback.weaknesses.join(", ")}
                            </div>
                        )}
                        {feedback.improvement && (
                            <div className="text-sm bg-indigo-50/80 p-3 rounded text-indigo-900 border border-indigo-100">
                                <span className="font-semibold">Improvement:</span> {feedback.improvement}
                            </div>
                        )}
                    </div>
                )}

                {breakdown.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium mb-3">Grading Breakdown</h3>
                        <div className="border rounded-md">
                            {breakdown.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between p-3 text-sm border-b last:border-0">
                                    <div className="flex-1 pr-4">
                                        <span className="font-medium text-foreground">{item.label || item.question_number || item.question}</span>
                                        {item.alternative_valid_concept && (
                                            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                                                Alternative Valid Concept
                                            </Badge>
                                        )}
                                        {item.review_flag && (
                                            <Badge variant="destructive" className="ml-2 text-[10px] uppercase">
                                                Review Required
                                            </Badge>
                                        )}
                                        <p className="text-muted-foreground text-xs mt-1">{item.feedback}</p>
                                        {item.status === 'Not Attempted' && (
                                            <p className="text-red-500 text-xs mt-1 font-semibold">Not Attempted</p>
                                        )}
                                    </div>
                                    <div className="font-mono font-medium">
                                        {item.score}/{item.max}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isEditing && (
                    <div className="space-y-6">
                        {submission.score?.teacherRemarks && (
                            <div>
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    Lecturer Diagnostic Feedback
                                </h3>
                                <p className="text-sm bg-muted/20 p-4 rounded-lg border-l-4 border-amber-500/50 leading-relaxed text-muted-foreground">
                                    {submission.score.teacherRemarks}
                                </p>
                            </div>
                        )}

                        {submission.score?.studentRemarks && (
                            <div>
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    Student Actionable Feedback
                                </h3>
                                <p className="text-sm bg-primary/10 p-4 rounded-lg border-l-4 border-primary leading-relaxed text-primary/90">
                                    {submission.score.studentRemarks}
                                </p>
                            </div>
                        )}

                        {!submission.score?.teacherRemarks && !submission.score?.studentRemarks && submission.score?.remarks && (
                            <div>
                                <h3 className="text-sm font-medium mb-2">Overall Remarks (Legacy)</h3>
                                <p className="text-sm text-muted-foreground italic">
                                    "{submission.score.remarks}"
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
