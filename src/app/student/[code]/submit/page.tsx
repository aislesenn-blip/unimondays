"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, Clock, Info } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentSubmitPage({ params }: { params: { code: string } }) {
  const code = params.code || "MATH-401";
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const router = useRouter();

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setIsDone(true);
      setTimeout(() => {
         router.push(`/student/${code}`);
      }, 2000);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />

      {/* Navigation */}
      <nav className="h-20 flex items-center px-8 sm:px-12 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 bg-white/60">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/student/${code}`}>
            <Button variant="ghost" className="text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 font-medium">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Coursework
            </Button>
          </Link>
          <div className="flex items-center gap-2">
             <span className="text-sm font-semibold text-slate-900">Final Project Draft</span>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded-md">Open</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-8 sm:p-12 w-full max-w-4xl mx-auto flex-1 relative z-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          className="w-full"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">Submit Assignment</h1>
            <p className="text-slate-500 font-medium max-w-md mx-auto flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" /> Due Nov 20, 2024 at 11:59 PM
            </p>
          </div>

          <Card className="border-slate-200/60 shadow-xl rounded-3xl bg-white overflow-hidden relative">
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {!isUploading && !isDone ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
                  >
                    <div
                      onClick={handleSimulateUpload}
                      className="w-full max-w-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group"
                    >
                      <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-50/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <UploadCloud className="h-8 w-8 text-indigo-500 relative z-10" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Drag & drop your exam PDF</h3>
                      <p className="text-slate-500 font-medium mb-8">or click to browse from your computer</p>

                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF up to 2GB</span>
                      </div>
                    </div>

                    <div className="mt-8 flex items-start gap-3 text-left max-w-xl bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">By submitting, you acknowledge that this work will be processed by our AI evaluation engine against the rubric provided by Dr. Sarah.</p>
                    </div>
                  </motion.div>
                ) : isUploading ? (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="p-20 flex flex-col items-center justify-center text-center min-h-[400px]"
                  >
                    <div className="relative mb-8">
                       <div className="h-24 w-24 border-4 border-indigo-100 rounded-full" />
                       <div className="h-24 w-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-indigo-500" />
                       </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Uploading Securely...</h3>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">Transferring your document to the AI grading queue.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-20 flex flex-col items-center justify-center text-center min-h-[400px] bg-emerald-50/30"
                  >
                    <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-8 shadow-inner relative overflow-hidden">
                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2)_0,transparent_100%)] animate-pulse" />
                       <CheckCircle2 className="h-10 w-10 text-emerald-600 relative z-10" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Submission Received</h3>
                    <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto mb-2">Your assignment is now in the queue for AI evaluation.</p>
                    <p className="text-emerald-600 font-semibold text-sm">Redirecting to dashboard...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
