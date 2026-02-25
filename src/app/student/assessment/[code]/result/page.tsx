"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Download, MessageSquare, AlertTriangle, FileText, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionResult {
  id: string;
  status: string;
  score: {
    totalMarks: number;
    remarks: string;
    breakdown: any;
  } | null;
  quiz: {
    title: string;
    totalMarks: number;
  };
  filePath: string;
}

export default function AssessmentResultPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      async function fetchResult() {
          try {
              const res = await fetch(`/api/quiz/${code}/submission`);
              if (res.ok) {
                  const data = await res.json();
                  setSubmission(data);
              } else {
                  if (res.status === 404) setError("Submission not found");
                  else setError("Failed to fetch result");
              }
          } catch (e) {
              setError("Network error");
          } finally {
              setLoading(false);
          }
      }
      fetchResult();
  }, [code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  if (error || !submission) {
       return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
             <h1 className="text-2xl font-bold text-destructive">Error</h1>
             <p>{error || "Could not load result"}</p>
             <Button onClick={() => router.push("/student/dashboard")}>Return to Dashboard</Button>
        </div>
       );
  }

  if (submission.status === 'PENDING' || submission.status === 'PROCESSING') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
            <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                <Clock className="h-10 w-10 text-blue-600" />
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Grading in Progress</h1>
                <p className="text-muted-foreground max-w-md">
                    Your submission for <span className="font-semibold">{submission.quiz.title}</span> has been received and is currently being processed by the AI Grading Engine.
                </p>
                <p className="text-sm text-muted-foreground">Status: <span className="font-mono bg-secondary px-2 py-1 rounded">{submission.status}</span></p>
            </div>
            <Button onClick={() => router.push("/student/dashboard")}>Return to Dashboard</Button>
        </div>
      );
  }

  const scorePercentage = submission.score ? Math.round((submission.score.totalMarks / submission.quiz.totalMarks) * 100) : 0;
  const breakdown = submission.score?.breakdown as any[] || [];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/student/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Assessment Result</h1>
            <p className="text-xs text-muted-foreground font-mono">CODE: {code}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {submission.score && (
               <div className="flex flex-col items-end">
                 <span className="text-2xl font-bold text-primary">{scorePercentage}%</span>
                 <span className="text-xs font-bold text-muted-foreground">
                    {submission.score.totalMarks} / {submission.quiz.totalMarks} MARKS
                 </span>
               </div>
           )}
           {submission.filePath && (
               <Button variant="outline" size="sm" onClick={() => window.open(submission.filePath, '_blank')}>
                 <Download className="mr-2 h-4 w-4" /> Download Script
               </Button>
           )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Main Feedback Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-muted/10">
            <div className="max-w-4xl mx-auto space-y-8">

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" /> Overall Feedback
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-lg leading-relaxed">
                        {submission.score?.remarks || "No feedback provided."}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                   <h3 className="font-bold text-xl">Detailed Breakdown</h3>
                   {Array.isArray(breakdown) && breakdown.length > 0 ? (
                       breakdown.map((item: any, idx: number) => (
                           <Card key={idx}>
                               <CardHeader className="p-4 pb-2">
                                   <div className="flex justify-between">
                                       <span className="font-semibold">Criterion {idx + 1}</span>
                                       <span className="font-bold">{item.score || item.marks} Marks</span>
                                   </div>
                               </CardHeader>
                               <CardContent className="p-4 pt-2 text-muted-foreground text-sm">
                                   {item.reason || item.feedback || JSON.stringify(item)}
                               </CardContent>
                           </Card>
                       ))
                   ) : (
                       <p className="text-muted-foreground">No detailed breakdown available.</p>
                   )}
                </div>

            </div>
        </div>

        {/* Sidebar Actions */}
        <div className="w-[300px] border-l bg-background p-6 space-y-6">
             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
               <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-2">
                 <AlertTriangle className="h-4 w-4" /> Appeal Grade
               </h4>
               <p className="text-xs text-yellow-700 mb-3">
                 Believe there was a mistake? Request a manual review.
               </p>
               <Button size="sm" variant="outline" className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                 Start Appeal
               </Button>
             </div>
        </div>

      </div>
    </div>
  );
}
