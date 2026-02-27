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
import { Eye, FileText, Download, CheckCircle, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { AppealModal } from "./AppealModal";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const isReleased = submission.isReleased; // Assuming API returns this flag or based on status
  // Allow appeal if grades are released, appeals are allowed, and not already appealed/pending
  const appealDeadlinePassed = submission.appealDeadline ? new Date() > new Date(submission.appealDeadline) : false;
  const canAppeal = isReleased && submission.allowAppeals && submission.status !== 'APPEALED' && !appealDeadlinePassed;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Result
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto p-0">
        <div className="p-6 pb-20 space-y-8">
            <SheetHeader>
            <SheetTitle>{submission.workSessionTitle || "Assessment Result"}</SheetTitle>
            <SheetDescription>
                Submitted on {new Date(submission.submittedAt).toLocaleString()}
            </SheetDescription>
            </SheetHeader>

            {/* Final Score Section */}
            {isReleased && submission.score !== null ? (
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-xl border shadow-sm">
                    <div>
                        <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Final Grade</div>
                        <div className="text-4xl font-extrabold text-primary">
                            {submission.score}
                            <span className="text-lg text-muted-foreground font-medium ml-1">/ {submission.totalMarks}</span>
                        </div>
                    </div>
                    {/* Appeal Button */}
                    <div className="flex flex-col items-end gap-1">
                        {canAppeal && (
                            <AppealModal submissionId={submission.id} onSuccess={() => window.location.reload()} />
                        )}
                        {submission.allowAppeals && appealDeadlinePassed && (
                            <div className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded">
                                Appeal window closed
                            </div>
                        )}
                         {submission.allowAppeals && !appealDeadlinePassed && submission.appealDeadline && (
                            <div className="text-[10px] text-muted-foreground">
                                Appeals close: {new Date(submission.appealDeadline).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 text-amber-900 p-4 rounded-lg text-sm border border-amber-100 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        <div className="font-semibold mb-1">Processing / Waiting for Release</div>
                        <p>Your submission has been received. Grades will be available once released by the lecturer.</p>
                    </div>
                </div>
            )}

            {/* Script Link */}
            {submission.filePath && (
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Original Submission
                    </h3>
                    <div className="flex gap-2">
                        <a
                            href={`/api/download?url=${encodeURIComponent(submission.filePath)}&inline=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center p-3 border rounded-lg hover:bg-accent transition-colors group"
                        >
                            <span className="text-sm text-blue-600 group-hover:underline">View Document</span>
                            <Eye className="ml-2 h-4 w-4 text-blue-500" />
                        </a>
                        <a
                            href={`/api/download?url=${encodeURIComponent(submission.filePath)}`}
                            download
                            className="flex-1 flex items-center justify-center p-3 border rounded-lg hover:bg-accent transition-colors group"
                        >
                            <span className="text-sm text-muted-foreground group-hover:text-foreground">Download</span>
                            <Download className="ml-2 h-4 w-4 text-muted-foreground" />
                        </a>
                    </div>
                </div>
            )}

            {isReleased && (
                <>
                     {/* 1. Student Answer (OCR) */}
                    {submission.ocrText && (
                        <div>
                             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                1. Your Answer (OCR)
                             </h3>
                             <div className="rounded-lg border bg-muted/10 p-4">
                                <ScrollArea className="h-[150px] w-full rounded-md border p-2 bg-background font-mono text-xs text-muted-foreground">
                                    {submission.ocrText}
                                </ScrollArea>
                                <p className="text-[10px] text-muted-foreground mt-2">* This is the text extracted by AI for grading.</p>
                             </div>
                        </div>
                    )}

                    {/* 2. Detailed Assessment (Expected vs Actual) */}
                    {breakdown.length > 0 && (
                        <div>
                             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                2. Detailed Assessment
                             </h3>
                             <div className="space-y-4">
                                {breakdown.map((item: any, i: number) => (
                                    <div key={i} className="border rounded-lg p-4 bg-card shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3 border-b pb-2">
                                            <span className="font-semibold text-sm">{item.question || `Question ${i+1}`}</span>
                                            <span className={`font-bold text-sm px-2 py-0.5 rounded ${item.score === item.max ? 'bg-green-100 text-green-700' : 'bg-muted text-foreground'}`}>
                                                {item.score} / {item.max}
                                            </span>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {/* Expected / Rubric Reference */}
                                            {item.rubricReference && (
                                                <div className="text-xs p-2 bg-muted/20 rounded">
                                                    <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] block mb-1">Expected / Criteria</span>
                                                    <p className="text-muted-foreground leading-relaxed">{item.rubricReference}</p>
                                                </div>
                                            )}

                                            {/* Feedback */}
                                            <div className="text-xs p-2 bg-blue-50/50 rounded border-blue-100 border">
                                                <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px] block mb-1">AI Feedback</span>
                                                <p className="text-foreground leading-relaxed">{item.feedback}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {/* 3. Overall Feedback (Remarks) */}
                    {feedback && (
                        <div>
                             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                3. Overall Feedback & Remarks
                             </h3>
                            <div className="space-y-3">
                                {feedback.strengths?.length > 0 && (
                                    <div className="text-sm bg-green-50 p-4 rounded-lg border border-green-100 text-green-900">
                                        <div className="flex items-center gap-2 font-semibold mb-2">
                                            <CheckCircle className="h-4 w-4" /> Strengths
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {feedback.weaknesses?.length > 0 && (
                                    <div className="text-sm bg-amber-50 p-4 rounded-lg border border-amber-100 text-amber-900">
                                        <div className="flex items-center gap-2 font-semibold mb-2">
                                            <AlertTriangle className="h-4 w-4" /> Areas for Improvement
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            {feedback.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {feedback.improvement && (
                                    <div className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-900">
                                        <div className="flex items-center gap-2 font-semibold mb-2">
                                            <ArrowUpCircle className="h-4 w-4" /> Actionable Advice
                                        </div>
                                        <p className="text-xs leading-relaxed">{feedback.improvement}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Remarks */}
                    {submission.remarks && (
                        <div className="p-4 bg-muted/10 rounded-lg italic text-sm text-muted-foreground border-l-4 border-primary/20">
                            " {submission.remarks} "
                        </div>
                    )}
                </>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
