"use client";

import { useParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSIONS, WORKS, SUBMISSIONS } from "@/lib/mock-data";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  MessageSquare,
  Sparkles,
  Download
} from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function GradePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const workId = params.workId as string;
  const studentId = params.studentId as string;
  const submission = SUBMISSIONS.find(s => s.studentId === studentId && s.workId === workId) || SUBMISSIONS[0];

  const [score, setScore] = useState(submission.score);
  const [feedback, setFeedback] = useState("");

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
              {submission.studentName}
              <span className="text-sm font-normal text-muted-foreground">({submission.regNo})</span>
            </h1>
            <p className="text-xs text-muted-foreground">Submission ID: {submission.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="text-right">
               <div className="text-xs text-muted-foreground">Total Score</div>
               <div className="text-xl font-bold text-primary">{score} <span className="text-sm text-muted-foreground">/ {submission.maxScore}</span></div>
             </div>
          </div>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save & Publish
          </Button>
        </div>
      </header>

      {/* Main Content: Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Script Preview */}
        <div className="flex-1 bg-muted/30 p-8 overflow-y-auto flex justify-center border-r">
          <div className="bg-white shadow-xl rounded-sm w-[600px] min-h-[850px] relative border flex flex-col shrink-0 mb-8">
            <div className="bg-gray-50 p-3 border-b flex justify-between items-center text-xs text-gray-500">
              <span className="font-mono">Page 1 of 2</span>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                 <Download className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 p-12 font-serif text-sm leading-relaxed text-gray-800 relative">
               {/* Mock Handwritten content */}
               <h2 className="text-xl font-bold mb-6 border-b pb-2 font-sans">Mid-Semester Quiz 1</h2>

               <div className="mb-8 relative group">
                 <p className="mb-2 font-sans font-semibold text-gray-900">Q1: Explain the concept of OOP.</p>
                 <div className="font-handwriting text-blue-900 text-base leading-7 pl-2 border-l-2 border-transparent group-hover:border-blue-200 transition-colors" style={{fontFamily: 'cursive'}}>
                   Object-Oriented Programming (OOP) is a programming paradigm based on the concept of "objects", which can contain data and code. The main principles are Encapsulation, Abstraction, Inheritance, and Polymorphism.
                 </div>

                 {/* Annotation */}
                 <div className="absolute -right-8 top-8 transform translate-x-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2 py-1 rounded shadow-sm flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Correct (+10)
                 </div>
               </div>

               <div className="mb-8 relative group">
                 <p className="mb-2 font-sans font-semibold text-gray-900">Q2: Write a Python function for Fibonacci.</p>
                 <div className="font-mono bg-gray-50 p-4 rounded mb-2 text-xs border border-gray-100">
                   {`def fib(n):
  if n <= 1: return n
  else: return fib(n-1) + fib(n-2)`}
                 </div>
                 <div className="font-handwriting text-blue-900 text-base leading-7 pl-2" style={{fontFamily: 'cursive'}}>
                   This is a recursive solution. It works but O(2^n).
                 </div>

                  {/* Annotation */}
                 <div className="absolute -right-8 top-12 transform translate-x-full bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-1 rounded shadow-sm flex items-center gap-1 max-w-[150px]">
                   <AlertCircle className="h-3 w-3 shrink-0" /> Inefficient Recursion (-2)
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Grading Panel */}
        <div className="w-[400px] bg-background border-l flex flex-col overflow-y-auto shrink-0">
          <div className="p-6 space-y-6">

            <Card className="bg-primary/5 border-primary/10 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {submission.aiReasoning}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded w-fit border border-emerald-200/50">
                   <CheckCircle2 className="h-3 w-3" />
                   Confidence: {submission.confidence}%
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center justify-between">
                Question Breakdown
                <span className="text-xs text-muted-foreground font-normal">Auto-graded</span>
              </h3>
              {submission.breakdown?.map((q, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 bg-card hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">Question {q.q}</span>
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
              ))}
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
