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
  let feedback: string = typeof submission.feedback === 'string' ? submission.feedback : "";
  let breakdown: any[] = [];
  let appealReason: string | null = null;

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

        <div className="space-y-6 py-6 font-sans">
            {/* ALERT: APPEAL PENDING */}
            {submission.status === 'APPEALED' && appealReason && (
                <div className="border border-amber-500/20 bg-amber-50/50 p-4 rounded-none">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <h4 className="text-amber-800 font-medium text-sm">Grade Appeal Pending</h4>
                    </div>
                    <p className="text-amber-900/80 text-sm leading-relaxed pl-6 italic">"{appealReason}"</p>
                    <p className="text-amber-700/60 text-xs pl-6 mt-2">Override the grade below to resolve this appeal.</p>
                </div>
            )}

            {/* Score Card & Override Engine (Apple/Uber Black Minimalist) */}
            <div className="flex flex-col gap-4 border-b pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Total Score</div>
                         {isEditing ? (
                             <div className="flex items-center gap-2 mt-1">
                                 <Input
                                     type="number"
                                     value={editedScore}
                                     onChange={(e) => setEditedScore(e.target.value)}
                                     className="w-24 h-9 bg-background border-foreground/20 rounded-none focus-visible:ring-0 focus-visible:border-foreground"
                                 />
                                 <span className="text-sm text-muted-foreground font-medium">/ {submission.workSession?.totalMarks}</span>
                             </div>
                         ) : (
                            <div className="text-3xl font-light text-foreground tracking-tight">
                                {submission.score?.totalMarks || 0}
                                <span className="text-lg text-muted-foreground font-light ml-1">/ {submission.workSession?.totalMarks}</span>
                            </div>
                         )}
                    </div>
                    <div className="flex items-center gap-3">
                         <Badge className={`rounded-none font-medium px-2 py-0.5 text-xs ${submission.status === 'GRADED' ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-0' : submission.status === 'APPEALED' ? 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-0' : 'bg-muted text-muted-foreground border-0'}`}>
                            {submission.status === 'APPEALED' ? 'Appeal Pending' : submission.status}
                        </Badge>
                         {!isEditing && (
                             <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-none border-foreground/20 hover:bg-foreground hover:text-background text-xs h-7 px-3">
                                 Override
                             </Button>
                         )}
                    </div>
                </div>

                {isEditing && (
                    <div className="space-y-3 pt-4 animate-in fade-in duration-200">
                        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lecturer Remarks</label>
                        <Textarea
                            value={editedRemarks}
                            onChange={(e) => setEditedRemarks(e.target.value)}
                            placeholder="Enter remarks explaining the override..."
                            className="bg-background min-h-[80px] rounded-none border-foreground/20 focus-visible:ring-0 focus-visible:border-foreground text-sm"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="rounded-none text-xs h-8">Cancel</Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs h-8 px-4">
                                {isSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Script Link Minimalist */}
            {submission.filePath && (
                <div className="flex gap-4 border-b pb-6">
                    <a
                        href={`/api/download?url=${encodeURIComponent(submission.filePath)}&inline=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        View Document
                    </a>
                    <a
                        href={`/api/download?url=${encodeURIComponent(submission.filePath)}`}
                        download
                        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </a>
                </div>
            )}

            {/* AI Feedback Minimalist */}
            {feedback && (
                <div className="space-y-3 border-b pb-6">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">AI Feedback</h3>
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {feedback}
                    </div>
                </div>
            )}

            {/* Breakdown Table Minimalist */}
            {breakdown.length > 0 && (
                <div className="pb-6">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Grading Breakdown</h3>
                    <div className="space-y-4">
                        {breakdown.map((item: any, i: number) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-4 mb-4 bg-white shadow-sm flex flex-col group">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <span className="font-medium text-sm text-foreground">{item.question}</span>
                                        <p className="text-slate-700 text-sm mt-1 leading-relaxed">
                                            {item.feedback?.includes('[Exact Match]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold mr-1">Exact Match</span> :
                                             item.feedback?.includes('[Partial Match]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold mr-1">Partial Match</span> :
                                             item.feedback?.includes('[Out of Scope]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold mr-1">Out of Scope</span> :
                                             item.feedback?.includes('[Missing]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold mr-1">Missing</span> : null}
                                            {item.feedback?.replace(/\[.*?\]\s*/, '')}
                                        </p>
                                    </div>
                                    <div className="font-mono text-sm text-right shrink-0 mt-0.5">
                                        <span className="font-semibold text-foreground">{item.score}</span>
                                        {(item.max || item.maxScore) > 0 && (
                                            <span className="text-muted-foreground">/{item.max || item.maxScore}</span>
                                        )}
                                    </div>
                                </div>
                                {item.evidenceSnippet && (
                                    <details className="mt-2">
                                        <summary className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60 hover:text-foreground cursor-pointer list-none flex items-center transition-colors select-none">
                                            <span className="mr-1.5 opacity-50 transition-transform text-[8px]">▶</span>
                                            Evidence
                                        </summary>
                                        <div className="pl-3 mt-2 border-l border-foreground/10">
                                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                                                "{item.evidenceSnippet}"
                                            </p>
                                        </div>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Remarks Minimalist */}
            {!isEditing && submission.score?.remarks && (
                <div className="border-t border-foreground/10 pt-6">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Overall Remarks</h3>
                    <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-foreground/20 pl-4 py-1">
                        "{submission.score.remarks}"
                    </p>
                </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
