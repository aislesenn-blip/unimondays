"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Sparkles, UploadCloud, Calendar, FileText, ToggleLeft, ToggleRight, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CreateWorkPage() {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [autoRelease, setAutoRelease] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mocking AI standardization and creation
    setTimeout(() => {
      setIsSubmitting(false);
      router.push(`/dashboard/classes/${params.id}`);
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href={`/dashboard/classes/${params.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Create Assignment</h1>
        <p className="text-slate-500">Upload your marking scheme. Playbook AI will standardize it into granular grading criteria.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8">

            {/* General Info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Assignment Details</h3>
              <div className="flex flex-col gap-3">
                <label htmlFor="title" className="text-sm font-medium text-slate-900">
                  Assignment Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination"
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label htmlFor="dueDate" className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" /> Due Date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    required
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label htmlFor="dueTime" className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" /> Time
                  </label>
                  <input
                    id="dueTime"
                    type="time"
                    required
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Rubric Upload */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" /> Marking Scheme
              </h3>

              <div className="relative group rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-500 transition-all text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="p-10 flex flex-col items-center justify-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    {file ? <FileText className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                        <Check className="h-3 w-3" /> Ready for AI Standardization
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-900">Drag & drop your marking scheme</p>
                      <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX up to 50MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Settings</h3>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Auto-Release Results</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Automatically publish AI-graded results to students once processing is complete.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoRelease(!autoRelease)}
                  className={`text-2xl transition-colors ${autoRelease ? 'text-blue-600' : 'text-slate-300'}`}
                >
                  {autoRelease ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !file}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-8 py-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="h-4 w-4 border-2 border-slate-50 border-t-transparent rounded-full"
                    />
                    Standardizing Rubric...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Standardize with AI
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
