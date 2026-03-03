"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, Sparkles, Download, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const EVALUATION = [
  { id: 1, type: "correct", title: "Photosynthesis Definition", marks: "5/5", remark: "Excellent. You accurately defined photosynthesis and correctly identified the role of chloroplasts.", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: 2, type: "partial", title: "Plant Structure Role", marks: "3/5", remark: "Good attempt. You identified the xylem and phloem but missed explaining how water transport facilitates the light-dependent reactions.", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: 3, type: "incorrect", title: "Cellular Respiration Link", marks: "0/10", remark: "Incorrect. You confused cellular respiration with transpiration. Photosynthesis produces glucose, which respiration breaks down.", color: "bg-red-50 text-red-700 border-red-200" },
];

export default function StudentResultsPage({ params }: { params: { code: string } }) {
  const code = params.code || "MATH-401";

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute bottom-[20%] left-[-20%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />

      {/* Navigation */}
      <nav className="h-20 flex items-center px-8 sm:px-12 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 bg-white/60">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
          <Link href={`/student/${code}`}>
            <Button variant="ghost" className="text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 font-medium">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 bg-white border border-slate-200 pl-4 pr-1.5 py-1.5 rounded-xl shadow-sm">
             <div className="flex flex-col text-right pr-2 border-r border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evaluation</span>
                <span className="text-sm font-semibold text-slate-900 tracking-wide">Complete</span>
             </div>
             <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
               <Sparkles className="h-4 w-4" />
             </div>
          </div>
        </div>
      </nav>

      <main className="p-8 sm:p-12 w-full max-w-5xl mx-auto relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        >
          {/* Header Card */}
          <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-[100px] -z-10" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none rounded-md px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
                  Graded by AI
                </Badge>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Midterm Examination Phase 1</h1>
                  <p className="text-slate-500 text-lg font-medium flex items-center gap-2">
                    Submitted on Oct 14, 2024 at 10:42 AM
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 min-w-[200px] text-center relative overflow-hidden group hover:border-indigo-200 transition-colors">
                 <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
                 <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-black tracking-tighter text-slate-900">94</span>
                    <span className="text-2xl font-bold text-slate-400">/100</span>
                 </div>
                 <Badge variant="secondary" className="mt-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none font-semibold px-3">
                   A-Tier Performance
                 </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <MessageSquareText className="h-6 w-6 text-indigo-600" />
                AI Feedback & Remarks
             </h2>
             <Button variant="outline" className="border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm font-semibold hidden sm:flex">
               <Download className="h-4 w-4 mr-2" /> Download Annotated PDF
             </Button>
          </div>

          {/* Feedback Grid */}
          <div className="grid grid-cols-1 gap-6">
            {EVALUATION.map((evalItem, i) => (
              <motion.div
                key={evalItem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
              >
                <Card className={`border shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md ${evalItem.color.split(' ')[2]} bg-white relative`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${evalItem.color.split(' ')[0]}`} />
                  <CardContent className="p-8 flex flex-col sm:flex-row gap-6 sm:items-start ml-2">
                     <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${evalItem.color.split(' ')[0]} ${evalItem.color.split(' ')[1]}`}>
                       {evalItem.type === 'correct' ? <CheckCircle2 className="h-6 w-6" /> :
                        evalItem.type === 'partial' ? <AlertCircle className="h-6 w-6" /> :
                        <XCircle className="h-6 w-6" />}
                     </div>
                     <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                           <h3 className="text-xl font-bold tracking-tight text-slate-900">{evalItem.title}</h3>
                           <div className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700 tracking-wide border border-slate-200 shadow-sm self-start sm:self-auto">
                              {evalItem.marks} Marks
                           </div>
                        </div>
                        <div className={`p-5 rounded-xl border font-medium leading-relaxed ${evalItem.color.split(' ')[0]} ${evalItem.color.split(' ')[1]} border-${evalItem.color.split(' ')[2].split('-')[2]}`}>
                           {evalItem.remark}
                        </div>
                     </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
