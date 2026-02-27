"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Download,
  FileText
} from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlaybookAI } from "@/components/icons/PlaybookAI";

interface GradeViewClientProps {
  sessionId: string;
  workId: string;
  submission: {
    id: string;
    studentName: string;
    detectedIdentity?: string | null;
    regNo: string;
    score: number;
    maxScore: number;
    aiReasoning: string;
    confidence: number;
    fileUrl: string | null;
    ocrText: string | null;
    breakdown: any[];
  };
}

export function GradeViewClient({ sessionId, workId, submission }: GradeViewClientProps) {
  const [score, setScore] = useState(submission.score);
  const [feedback, setFeedback] = useState("");
  const [activeTab, setActiveTab] = useState<'document' | 'grading'>('document'); // Mobile Tab State

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 md:-m-8">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sessions/${sessionId}/work/${workId}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
             <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              {submission.detectedIdentity || submission.studentName}
              <span className="text-sm font-normal text-muted-foreground">({submission.regNo})</span>
            </h1>
            <p className="text-xs text-muted-foreground">Submission ID: {submission.id}</p>
          </div>
        </div>

        {/* Desktop Pagination */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="mr-2 h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="text-right hidden sm:block">
               <div className="text-xs text-muted-foreground">Total Score</div>
               <div className="text-xl font-bold text-primary">{score} <span className="text-sm text-muted-foreground">/ {submission.maxScore}</span></div>
             </div>
          </div>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Save & Publish</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="flex md:hidden border-b bg-muted/20">
          <button
            className={cn("flex-1 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'document' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
            onClick={() => setActiveTab('document')}
          >
            Document
          </button>
          <button
            className={cn("flex-1 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'grading' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
            onClick={() => setActiveTab('grading')}
          >
            Grading
          </button>
      </div>

      {/* Main Content: Split View (Desktop) / Tab View (Mobile) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Script Preview */}
        <div className={cn(
            "flex-1 bg-muted/30 p-4 md:p-8 overflow-y-auto flex justify-center border-r transition-transform duration-300 absolute inset-0 md:static z-0",
            activeTab === 'document' ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="bg-white shadow-xl rounded-sm w-full md:w-[600px] min-h-[500px] md:min-h-[850px] relative border flex flex-col shrink-0 mb-8">
            <div className="bg-gray-50 p-3 border-b flex justify-between items-center text-xs text-gray-500">
              <span className="font-mono">Document Viewer</span>
              {submission.fileUrl && (
                <a href={submission.fileUrl} download target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                     <Download className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
            <div className="flex-1 p-0 relative bg-gray-200">
               {submission.fileUrl ? (
                 <iframe
                   src={submission.fileUrl}
                   className="w-full h-full border-0"
                   title="Submission PDF"
                 />
               ) : (
                 <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center">
                   <div>
                     <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                     <p>No file attached.</p>
                     {submission.ocrText && (
                       <div className="mt-4 text-left p-4 bg-white border rounded text-xs font-mono whitespace-pre-wrap max-h-[400px] overflow-auto">
                         {submission.ocrText}
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Pane: Grading Panel */}
        <div className={cn(
            "w-full md:w-[400px] bg-background border-l flex flex-col overflow-y-auto shrink-0 transition-transform duration-300 absolute inset-0 md:static z-10 md:z-0",
            activeTab === 'grading' ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>
          <div className="p-6 space-y-6">

            <Card className="bg-primary/5 border-primary/10 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                  <PlaybookAI className="h-4 w-4" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {submission.aiReasoning || "No AI analysis available yet."}
                </p>
                {submission.confidence && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded w-fit border border-emerald-200/50">
                     <CheckCircle2 className="h-3 w-3" />
                     Confidence: {submission.confidence}%
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center justify-between">
                Question Breakdown
                <span className="text-xs text-muted-foreground font-normal">Auto-graded</span>
              </h3>
              {submission.breakdown && submission.breakdown.length > 0 ? (
                submission.breakdown.map((q, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 bg-card hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{q.question || `Question ${idx + 1}`}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        defaultValue={q.score}
                        className="w-16 h-8 text-right font-medium"
                        max={q.max}
                      />
                      <span className="text-xs text-muted-foreground">/ {q.max}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded italic">
                    {q.feedback}
                  </div>
                </div>
              ))) : (
                <div className="text-sm text-muted-foreground italic">No breakdown available.</div>
              )}
            </div>

            <div className="space-y-2 pb-6">
              <h3 className="font-semibold text-sm">Overall Feedback</h3>
              <Textarea
                placeholder="Add comments for the student..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
