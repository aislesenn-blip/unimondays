"use client";

import { useState } from "react";
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
import { Eye, FileText, Download, Loader2, AlertTriangle, AlertCircle, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface SubmissionDrawerProps {
  submission: any; // Ideally typed, but 'any' for speed/parsing
}

export function SubmissionDrawer({ submission }: SubmissionDrawerProps) {
  // State for Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedScore, setEditedScore] = useState(submission.score?.totalMarks || 0);
  const [editedRemarks, setEditedRemarks] = useState(submission.score?.remarks || "");
  const [isSaving, setIsSaving] = useState(false);

  // Parsing JSON fields if they are strings
  let feedback: any = {};
  let breakdown: any[] = [];
  let appealReason: string | null = null;

  try {
      feedback = typeof submission.feedback === 'string' ? JSON.parse(submission.feedback) : (submission.feedback || {});
  } catch (e) {
      console.warn("Failed to parse feedback JSON", e);
  }

  try {
      breakdown = submission.score?.breakdown
        ? (typeof submission.score.breakdown === 'string' ? JSON.parse(submission.score.breakdown) : submission.score.breakdown)
        : [];
      if (!Array.isArray(breakdown)) breakdown = []; // Ensure array
  } catch (e) {
      console.warn("Failed to parse breakdown JSON", e);
  }

  if (submission.status === 'APPEALED' || (submission.appeals && submission.appeals.length > 0)) {
      // Find pending appeal
      const pending = submission.appeals?.find((a: any) => a.status === 'PENDING');
      if (pending) appealReason = pending.reason;
      else if (submission.appeals && submission.appeals.length > 0) appealReason = submission.appeals[0].reason; // Fallback
  }

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const res = await fetch(`/api/work-sessions/${submission.workSessionId}/submissions/${submission.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  totalScore: editedScore,
                  remarks: editedRemarks
              })
          });

          if (!res.ok) throw new Error("Update failed");

          toast.success("Grade Updated Successfully");
          setIsEditing(false);

          // Trigger global notification update
          window.dispatchEvent(new Event('notification-update'));

          // Reload page data
          window.location.reload();
      } catch (e) {
          toast.error("Failed to update grade");
      } finally {
          setIsSaving(false);
      }
  };

  // Confidence Logic
  const confidence = submission.confidenceScore || 0;
  const isHighTrust = confidence >= 80;
  const isMediumTrust = confidence >= 50 && confidence < 80;
  const confidenceColor = isHighTrust ? "bg-green-500" : isMediumTrust ? "bg-yellow-500" : "bg-red-500";
  const confidenceLabel = isHighTrust ? "High Trust" : isMediumTrust ? "Medium Trust" : "Low Trust";

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
            {/* ALERT: APPEAL PENDING */}
            {submission.status === 'APPEALED' && appealReason && (
                <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-900">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-800 font-bold">Grade Appeal Pending</AlertTitle>
                    <AlertDescription className="mt-2 text-sm leading-relaxed">
                        <span className="font-semibold block mb-1">Student's Reason:</span>
                        "{appealReason}"
                        <div className="mt-3 text-xs text-orange-700/80">
                            Override the grade below to resolve this appeal automatically.
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Score Card & Override Engine */}
            <div className="flex flex-col gap-4 p-4 bg-muted rounded-lg">
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
                                 Override / Resolve
                             </Button>
                         )}
                         <Badge variant={submission.status === 'GRADED' ? 'default' : submission.status === 'APPEALED' ? 'destructive' : 'secondary'}>
                            {submission.status === 'APPEALED' ? 'Appeal Pending' : submission.status}
                        </Badge>
                    </div>
                </div>

                {/* AI Confidence Card */}
                {submission.status !== 'PENDING' && (
                    <div className="bg-background rounded border p-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                {isHighTrust ? <ShieldCheck className="h-3 w-3 text-green-500" /> : <ShieldAlert className="h-3 w-3 text-yellow-500" />}
                                AI Confidence: <span className="text-foreground">{Math.round(confidence)}%</span>
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isHighTrust ? "bg-green-100 text-green-700" : isMediumTrust ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                {confidenceLabel}
                            </span>
                        </div>
                        <Progress value={confidence} className="h-1.5" indicatorColor={confidenceColor} />
                    </div>
                )}

                {isEditing && (
                    <div className="space-y-2 border-t pt-4 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-sm font-medium">Lecturer Remarks</label>
                        <Textarea
                            value={editedRemarks}
                            onChange={(e) => setEditedRemarks(e.target.value)}
                            placeholder="Enter remarks explaining the override..."
                            className="bg-background min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Script Link */}
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

            {/* AI Feedback (V2 doesn't return these, but keeping logic for backward compatibility or if populated) */}
            {feedback && (feedback.strengths?.length > 0 || feedback.weaknesses?.length > 0 || feedback.improvement) && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium">AI Feedback</h3>
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
                        <div className="text-sm bg-blue-50 p-3 rounded text-blue-800">
                            <span className="font-semibold">Improvement:</span> {feedback.improvement}
                        </div>
                    )}
                </div>
            )}

            {/* Breakdown Table (V2 Logic) */}
            {breakdown.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium mb-3">Grading Breakdown</h3>
                    <div className="border rounded-md">
                        {breakdown.map((item: any, i: number) => {
                             // Handle V2 vs V1 properties
                             const question = item.question_id || item.question;
                             const score = item.marks_awarded !== undefined ? item.marks_awarded : item.score;
                             const max = item.max_marks !== undefined ? item.max_marks : item.max;
                             const justification = item.justification || item.feedback;

                             // V2 specific
                             const tier = item.tier_used;
                             const isAlternative = item.alternative_valid_concept;
                             const needsReview = item.review_flag;

                             return (
                                <div key={i} className="flex flex-col p-3 text-sm border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-foreground">{question}</span>
                                                {tier && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{tier}</Badge>}
                                                {item.status === 'Not Attempted' && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Not Attempted</Badge>}
                                            </div>
                                            <p className="text-muted-foreground text-xs leading-relaxed">{justification}</p>
                                        </div>
                                        <div className="font-mono font-medium text-right shrink-0">
                                            {score}/{max}
                                        </div>
                                    </div>

                                    {/* Warnings / Flags */}
                                    {(needsReview || isAlternative) && (
                                        <div className="mt-2 flex gap-2">
                                            {needsReview && (
                                                <div className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded flex items-center gap-1.5">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    AI Review Flag: Confirm mark allocation.
                                                </div>
                                            )}
                                            {isAlternative && (
                                                <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1.5">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Alternative Concept Validated
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                             );
                        })}
                    </div>
                </div>
            )}

            {/* Remarks - Only show if NOT editing (since we show textarea when editing) */}
            {!isEditing && submission.score?.remarks && (
                <div>
                    <h3 className="text-sm font-medium mb-2">Overall Remarks</h3>
                    <p className="text-sm text-muted-foreground italic">
                        "{submission.score.remarks}"
                    </p>
                </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
