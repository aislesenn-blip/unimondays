"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, BrainCircuit, GraduationCap, FileText, CheckCircle2, AlertCircle } from "lucide-react";

const mockResults = [
  {
    id: 1,
    question: "Explain the process of photosynthesis and its importance to plants.",
    score: 3,
    maxScore: 5,
    tier: "Partial Understanding",
    tierColor: "text-amber-600",
    tierBg: "bg-amber-50",
    feedback: "You defined photosynthesis well but failed to answer the question completely because it asked how photosynthesis helps the plant (e.g., energy storage, growth). Ensure you address all parts of the prompt.",
  },
  {
    id: 2,
    question: "Describe the function of mitochondria in a cell.",
    score: 5,
    maxScore: 5,
    tier: "Excellent",
    tierColor: "text-emerald-600",
    tierBg: "bg-emerald-50",
    feedback: "Perfectly explained. You correctly identified mitochondria as the powerhouse of the cell and accurately described ATP production.",
  },
  {
    id: 3,
    question: "What is the difference between mitosis and meiosis?",
    score: 2,
    maxScore: 10,
    tier: "Needs Review",
    tierColor: "text-rose-600",
    tierBg: "bg-rose-50",
    feedback: "You mentioned cell division but confused the two processes. Mitosis results in two identical daughter cells, while meiosis leads to four genetically distinct cells. Review the phases of each.",
  }
];

export default function StudentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [isEvaluating, setIsEvaluating] = useState(true);

  useEffect(() => {
    // Simulate AI evaluation time
    const timer = setTimeout(() => {
      setIsEvaluating(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const totalScore = mockResults.reduce((acc, curr) => acc + curr.score, 0);
  const totalMax = mockResults.reduce((acc, curr) => acc + curr.maxScore, 0);
  const percentage = Math.round((totalScore / totalMax) * 100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => router.push(`/student/${code}/submit`)}
            className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Submit
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Playbook <span className="text-slate-400 font-light">Lite</span></span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 mt-12">
        <AnimatePresence mode="wait">
          {isEvaluating ? (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 z-10">
                  <BrainCircuit className="w-10 h-10 text-blue-600 animate-pulse" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">AI Evaluation in Progress</h2>
              <p className="text-slate-500 text-lg max-w-md text-center">
                Our grading engine is analyzing your submission against the teacher&apos;s rubric...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Score Dashboard Header */}
              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200/60 mb-12 flex flex-col md:flex-row items-center justify-between gap-10">
                <div>
                  <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Evaluation Complete
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
                    Biology Midterm Review
                  </h1>
                  <p className="text-slate-500 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Class Code: <span className="font-mono text-slate-900 ml-1 bg-slate-100 px-2 py-0.5 rounded-md">{code}</span>
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center w-48 h-48 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-transparent to-transparent opacity-50"></div>
                  <span className="text-6xl font-black relative z-10">{percentage}%</span>
                  <span className="text-slate-400 font-medium mt-1 relative z-10">{totalScore} / {totalMax} Marks</span>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Detailed AI Remarks</h3>

                {mockResults.map((result, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    key={result.id}
                    className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                      <div className="flex-1">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 block">Question {result.id}</span>
                        <h4 className="text-lg font-semibold text-slate-800 leading-snug">
                          {result.question}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <div className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center ${result.tierBg} ${result.tierColor}`}>
                          {result.tier === 'Excellent' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                          {result.tier === 'Needs Review' && <AlertCircle className="w-4 h-4 mr-2" />}
                          {result.tier}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-slate-900">{result.score}</span>
                          <span className="text-slate-400 font-medium">/{result.maxScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <div className="flex items-start">
                        <Sparkles className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-700 leading-relaxed">
                          {result.feedback}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
