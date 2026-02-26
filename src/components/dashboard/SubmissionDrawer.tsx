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
import { Eye, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubmissionDrawerProps {
  submission: any; // Ideally typed, but 'any' for speed/parsing
}

export function SubmissionDrawer({ submission }: SubmissionDrawerProps) {
  // Parsing JSON fields if they are strings
  let feedback: any = {};
  let breakdown: any[] = [];

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
          <SheetDescription>
            {submission.studentName || submission.studentRegNo || 'Unknown Student'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
            {/* Score Card */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                    <div className="text-sm text-muted-foreground">Total Score</div>
                    <div className="text-2xl font-bold">
                        {submission.score?.totalMarks || 0}
                        <span className="text-sm text-muted-foreground font-normal"> / {submission.workSession?.totalMarks}</span>
                    </div>
                </div>
                <Badge variant={submission.status === 'GRADED' ? 'default' : 'secondary'}>
                    {submission.status}
                </Badge>
            </div>

            {/* Script Link */}
            {submission.filePath && (
                <div>
                    <h3 className="text-sm font-medium mb-2">Original Script</h3>
                    <a href={submission.filePath} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 border rounded-md hover:bg-accent transition-colors">
                        <FileText className="h-5 w-5 mr-3 text-blue-500" />
                        <span className="text-sm truncate flex-1">{submission.filePath.split('/').pop()}</span>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                </div>
            )}

            {/* AI Feedback */}
            {feedback && (
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

            {/* Breakdown Table */}
            {breakdown.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium mb-3">Grading Breakdown</h3>
                    <div className="border rounded-md">
                        {breakdown.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 text-sm border-b last:border-0">
                                <div className="flex-1 pr-4">
                                    <span className="font-medium text-foreground">{item.question}</span>
                                    <p className="text-muted-foreground text-xs mt-1">{item.feedback}</p>
                                </div>
                                <div className="font-mono font-medium">
                                    {item.score}/{item.max}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Remarks */}
            {submission.score?.remarks && (
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
