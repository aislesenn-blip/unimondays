"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Download } from "lucide-react";
import { AppealModal } from "./AppealModal";

export function StudentResultDrawer({ submission }: { submission: any }) {
  // Parse logic
  let feedback: any = {};
  let breakdown: any[] = [];
  try {
      feedback = typeof submission.feedback === 'string' ? JSON.parse(submission.feedback) : (submission.feedback || {});
      breakdown = submission.breakdown
        ? (typeof submission.breakdown === 'string' ? JSON.parse(submission.breakdown) : submission.breakdown)
        : [];
      if (!Array.isArray(breakdown)) breakdown = [];
  } catch (e) { console.warn(e); }

  const isReleased = submission.isReleased;
  const canAppeal = submission.status === 'GRADED';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Result
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{submission.workSessionTitle}</SheetTitle>
          <SheetDescription>
            Submitted on {new Date(submission.submittedAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
            {/* Score Card - Only if Released */}
            {isReleased && submission.score !== null ? (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div>
                        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Final Grade</div>
                        <div className="text-3xl font-bold mt-1 text-primary">
                            {submission.score}
                            <span className="text-sm text-muted-foreground font-normal ml-1">/ {submission.totalMarks}</span>
                        </div>
                    </div>
                    {/* Appeal Button */}
                    {canAppeal && (
                        <AppealModal submissionId={submission.id} onSuccess={() => window.location.reload()} />
                    )}
                </div>
            ) : (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm border border-yellow-100">
                    <div className="font-semibold mb-1">Processing / Waiting for Release</div>
                    Your submission has been received. Grades will be available once released by the lecturer.
                </div>
            )}

            {/* Script Link */}
            {submission.filePath && (
                <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Original Submission
                    </h3>
                    <a href={submission.filePath} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 border rounded-md hover:bg-accent transition-colors group">
                        <span className="text-sm truncate flex-1 text-blue-600 group-hover:underline">Download Script</span>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                </div>
            )}

            {/* AI Feedback - Only if Released */}
            {isReleased && feedback && (
                <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-medium">AI Feedback</h3>
                    {feedback.strengths?.length > 0 && (
                        <div className="text-sm bg-green-50/50 p-3 rounded border border-green-100 text-foreground">
                            <span className="font-semibold text-green-700 block mb-1">Strengths</span>
                            {feedback.strengths.join(". ")}
                        </div>
                    )}
                    {feedback.weaknesses?.length > 0 && (
                        <div className="text-sm bg-amber-50/50 p-3 rounded border border-amber-100 text-foreground">
                            <span className="font-semibold text-amber-700 block mb-1">Areas for Improvement</span>
                            {feedback.weaknesses.join(". ")}
                        </div>
                    )}
                    {feedback.improvement && (
                        <div className="text-sm bg-blue-50/50 p-3 rounded border border-blue-100 text-blue-800">
                            <span className="font-semibold block mb-1">Actionable Advice</span>
                            {feedback.improvement}
                        </div>
                    )}
                </div>
            )}

            {/* Breakdown Table - Only if Released */}
            {isReleased && breakdown.length > 0 && (
                <div className="pt-2">
                    <h3 className="text-sm font-medium mb-3">Detailed Breakdown</h3>
                    <div className="border rounded-md overflow-hidden">
                        {breakdown.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 text-sm border-b last:border-0 hover:bg-muted/30">
                                <div className="flex-1 pr-4">
                                    <span className="font-medium text-foreground">{item.question || `Question ${i+1}`}</span>
                                    <p className="text-muted-foreground text-xs mt-1">{item.feedback}</p>
                                </div>
                                <div className="font-mono font-medium text-right min-w-[3rem] text-foreground">
                                    {item.score}/{item.max}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Remarks - Only if Released */}
            {isReleased && submission.remarks && (
                <div className="pt-2">
                    <h3 className="text-sm font-medium mb-2">Lecturer/AI Remarks</h3>
                    <p className="text-sm text-muted-foreground italic border-l-2 pl-3 py-1">
                        "{submission.remarks}"
                    </p>
                </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
