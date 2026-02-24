"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Download, MessageSquare, AlertTriangle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssessmentResultPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  // Mock Result Data
  const result = {
    score: 82,
    grade: "A",
    feedback: "Excellent work on the core concepts. Your explanation of OOP principles was detailed. However, question 3 missed the key formula.",
    scriptUrl: "https://placehold.co/600x800/f8fafc/e2e8f0?text=Student+Physical+Script+Page+1", // Mock Script
    questions: [
      { id: 1, text: "Explain OOP Principles", max: 10, score: 9, comment: "Great detail." },
      { id: 2, text: "HTTP Methods", max: 5, score: 5, comment: "Correct." },
      { id: 3, text: "Calculate Velocity", max: 10, score: 6, comment: "Formula applied correctly but calculation error." },
    ]
  };

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
           <div className="flex flex-col items-end">
             <span className="text-2xl font-bold text-primary">{result.score}%</span>
             <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 rounded-full">{result.grade} GRADE</span>
           </div>
           <Button variant="outline" size="sm">
             <Download className="mr-2 h-4 w-4" /> Download
           </Button>
        </div>
      </header>

      {/* Split View Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Script Viewer */}
        <div className="flex-1 bg-muted/30 p-8 overflow-y-auto flex justify-center border-r relative">
           <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
             Original Script
           </div>
           <div className="max-w-3xl w-full bg-white shadow-xl min-h-[1000px] relative">
             {/* Mock PDF Viewer */}
             <img src={result.scriptUrl} alt="Script Page 1" className="w-full h-full object-cover opacity-90" />

             {/* Mock Annotation Overlay */}
             <div className="absolute top-[20%] right-[10%] bg-red-100 border border-red-500 text-red-700 px-2 py-1 text-sm rounded shadow-sm transform rotate-3">
               -1 Calculation Error
             </div>
             <div className="absolute top-[10%] left-[5%] bg-emerald-100 border border-emerald-500 text-emerald-700 px-2 py-1 text-sm rounded shadow-sm">
               Excellent!
             </div>
           </div>
        </div>

        {/* Right: AI Feedback & Audit */}
        <div className="w-[400px] bg-background flex flex-col border-l shrink-0">
          <div className="p-6 border-b bg-muted/10">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" /> AI Feedback
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.feedback}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="space-y-4">
               <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Question Breakdown</h4>
               {result.questions.map((q) => (
                 <Card key={q.id} className="border-l-4 border-l-primary/50">
                   <CardHeader className="p-4 pb-2">
                     <div className="flex justify-between items-start">
                       <span className="font-medium text-sm">Q{q.id}: {q.text}</span>
                       <span className="font-bold text-sm">{q.score}/{q.max}</span>
                     </div>
                   </CardHeader>
                   <CardContent className="p-4 pt-2 text-xs text-muted-foreground bg-muted/20">
                     AI Comment: {q.comment}
                   </CardContent>
                 </Card>
               ))}
             </div>

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
    </div>
  );
}
