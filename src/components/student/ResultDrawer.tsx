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
  let feedback: any = submission.feedback;
  let breakdown: any[] = [];
  try {
      // FIX: Read from submission.breakdown directly because the API flattened it
      const rawBreakdown = submission.breakdown;
      breakdown = rawBreakdown
        ? (typeof rawBreakdown === 'string' ? JSON.parse(rawBreakdown) : rawBreakdown)
        : [];
      if (!Array.isArray(breakdown)) breakdown = [];
  } catch (e) { console.warn("Failed to parse breakdown", e); }

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
                <div className="flex items-center justify-between p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="text-xs uppercase tracking-widest font-bold text-emerald-600/80 mb-1">Final Grade</div>
                        <div className="text-5xl font-black text-emerald-700 tracking-tight">
                            {typeof submission.score === 'object' ? submission.score?.totalMarks : submission.score}
                            <span className="text-xl text-emerald-600/50 font-bold ml-1">/ {submission.totalMarks}</span>
                        </div>
                    </div>
                    {/* Appeal Button */}
                    <div className="flex flex-col items-end gap-2 relative z-10">
                        {canAppeal && (
                            <AppealModal submissionId={submission.id} onSuccess={() => window.location.reload()} />
                        )}
                        {submission.allowAppeals && appealDeadlinePassed && (
                            <div className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                                Appeal window closed
                            </div>
                        )}
                         {submission.allowAppeals && !appealDeadlinePassed && submission.appealDeadline && (
                            <div className="text-[10px] font-medium text-emerald-600/70 bg-emerald-100/50 px-2 py-1 rounded-full">
                                Appeals close: {new Date(submission.appealDeadline).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-sm border border-amber-100 flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                        <div className="font-bold mb-1">Processing / Waiting for Release</div>
                        <p className="text-amber-800/80">Your submission has been received. Grades will be available once released by the lecturer.</p>
                    </div>
                </div>
            )}

            {/* Script Link */}
            {submission.filePath && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" /> Original Submission
                    </h3>
                    <div className="flex gap-3">
                        <a
                            href={`/api/download?url=${encodeURIComponent(submission.filePath)}&inline=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center py-2.5 px-4 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all group shadow-sm text-slate-600 font-medium text-sm"
                        >
                            <Eye className="mr-2 h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            View Document
                        </a>
                        <a
                            href={`/api/download?url=${encodeURIComponent(submission.filePath)}`}
                            download
                            className="flex-1 flex items-center justify-center py-2.5 px-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group shadow-sm text-slate-600 font-medium text-sm"
                        >
                            <Download className="mr-2 h-4 w-4 text-slate-400" />
                            Download
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
                             <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" /> Detailed Assessment
                             </h3>
                             <div className="space-y-4">
                                {breakdown.map((item: any, i: number) => (
                                    <div key={i} className="border border-slate-200 rounded-lg p-4 mb-4 bg-white shadow-sm flex flex-col group">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <span className="font-medium text-sm text-slate-800">{item.question || `Q${i+1}`}</span>
                                                <p className="text-slate-700 text-sm mt-1 leading-relaxed">
                                                    {item.feedback?.includes('[Exact Match]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold mr-1">Exact Match</span> :
                                                     item.feedback?.includes('[Partial Match]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold mr-1">Partial Match</span> :
                                                     item.feedback?.includes('[Out of Scope]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold mr-1">Out of Scope</span> :
                                                     item.feedback?.includes('[Missing]') ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold mr-1">Missing</span> : null}
                                                    {item.feedback?.replace(/\[.*?\]\s*/, '')}
                                                </p>
                                            </div>
                                            <div className="font-mono text-sm text-right shrink-0 mt-0.5">
                                                <span className="font-semibold text-slate-800">{item.score}</span>
                                                <span className="text-slate-500">/{item.max || item.maxScore || 0}</span>
                                            </div>
                                        </div>
                                        {/* Notice: We don't render evidence snippet in Student view to keep it clean, as per requirements. But it's available. */}
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {/* 3. Overall Feedback (Remarks) */}
                    {feedback && (
                        <div>
                             <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                Overall Feedback
                             </h3>
                             <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl text-sm leading-relaxed border border-slate-200 shadow-sm text-slate-700 font-medium">
                                 {feedback}
                             </div>
                        </div>
                    )}

                    {/* Remarks */}
                    {submission.remarks && (
                        <div className="p-5 bg-teal-50/50 rounded-2xl italic text-sm text-teal-800 border border-teal-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-400"></div>
                            <span className="text-teal-300 font-serif text-2xl absolute top-2 left-4 opacity-50">"</span>
                            <div className="pl-4 pt-1 font-medium relative z-10">{submission.remarks}</div>
                        </div>
                    )}
                </>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
