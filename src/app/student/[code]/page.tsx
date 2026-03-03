"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, GraduationCap, Clock, CheckCircle2, FileText, BarChart3, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const ASSIGNMENTS = [
  { id: 1, title: "Midterm Examination Phase 1", due: "Oct 15, 2024", status: "graded", score: "94%", link: "results" },
  { id: 2, title: "Calculus Assignment 4", due: "Nov 02, 2024", status: "pending", score: "—", link: "results" },
  { id: 3, title: "Final Project Draft", due: "Nov 20, 2024", status: "open", score: "—", link: "submit" },
];

export default function StudentDashboard({ params }: { params: { code: string } }) {
  const code = params.code || "MATH-401";

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] right-[10%] w-[30%] h-[30%] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />

      {/* Navigation */}
      <nav className="h-20 flex items-center px-8 sm:px-12 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 bg-white/60">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-emerald-100 shadow-sm flex items-center justify-center">
               <GraduationCap className="h-6 w-6 text-emerald-600" />
             </div>
             <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">Student Portal</span>
                <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Playbook Lite</span>
             </div>
          </div>
          <Link href="/student">
            <Button variant="ghost" className="text-slate-500 hover:bg-slate-100 rounded-xl font-medium">
              Exit Class
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-8 sm:p-12 w-full max-w-6xl mx-auto flex-1 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-10"
        >
          {/* Class Header */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-bl-[100px] -z-10" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900">Advanced Mathematics</h1>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none rounded-md px-2.5 py-1 font-semibold uppercase tracking-wider text-xs">
                    {code}
                  </Badge>
                </div>
                <p className="text-slate-500 text-lg font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  Dr. Sarah • Fall 2024
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Grade</p>
                  <p className="text-3xl font-bold text-slate-900 tracking-tighter">94<span className="text-lg text-slate-400">%</span></p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-emerald-600" />
                Coursework
              </h2>
            </div>

            <div className="space-y-4">
              {ASSIGNMENTS.map((assignment, i) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                >
                  <Link href={`/student/${code}/${assignment.link}`} className="block group">
                    <Card className="border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200/50 bg-white transition-all duration-300 rounded-2xl overflow-hidden relative">
                      {assignment.status === 'open' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                      )}
                      {assignment.status === 'graded' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                      )}
                      {assignment.status === 'pending' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400" />
                      )}

                      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                            assignment.status === 'graded' ? 'bg-emerald-50 text-emerald-600' :
                            assignment.status === 'open' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {assignment.status === 'graded' ? <CheckCircle2 className="h-6 w-6" /> :
                             assignment.status === 'open' ? <FileText className="h-6 w-6" /> :
                             <Clock className="h-6 w-6" />}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors mb-1">{assignment.title}</h3>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" /> Due {assignment.due}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-6 border-t border-slate-100 sm:border-0 pt-4 sm:pt-0 w-full sm:w-auto">
                          <div className="text-left sm:text-right">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status</p>
                             {assignment.status === 'graded' ? (
                               <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none px-2 py-0.5 shadow-none font-semibold">Graded</Badge>
                             ) : assignment.status === 'pending' ? (
                               <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-none px-2 py-0.5 shadow-none font-semibold">Under Review</Badge>
                             ) : (
                               <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none px-2 py-0.5 shadow-none font-semibold">Action Required</Badge>
                             )}
                          </div>

                          <div className="text-right min-w[4rem]">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Score</p>
                             <p className={`text-lg font-bold tracking-tight ${assignment.status === 'graded' ? 'text-slate-900' : 'text-slate-400'}`}>
                               {assignment.score}
                             </p>
                          </div>

                          <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
