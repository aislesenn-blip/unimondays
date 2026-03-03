"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateClassPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mocking an API call
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Create New Class</h1>
        <p className="text-slate-500">Set up a new workspace for your students, assignments, and AI grading rules.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">

            <div className="flex flex-col gap-3">
              <label htmlFor="className" className="text-sm font-medium text-slate-900">
                Class Name
              </label>
              <input
                id="className"
                type="text"
                required
                placeholder="e.g. Introduction to Computer Science"
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label htmlFor="courseCode" className="text-sm font-medium text-slate-900">
                Course Code
              </label>
              <div className="relative">
                <input
                  id="courseCode"
                  type="text"
                  required
                  placeholder="e.g. CS101"
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all uppercase"
                />
                <div className="absolute right-3 top-2.5 text-xs font-mono text-slate-400">
                  Auto-generates Access Code
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label htmlFor="description" className="text-sm font-medium text-slate-900">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Briefly describe what this class covers..."
                className="flex w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex gap-4 items-start mt-4">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-slate-900">AI Initialization</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Once created, you&apos;ll be able to upload marking schemes for assignments. The Playbook AI engine will automatically standardize them into granular grading criteria.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-8 py-2 shadow-sm"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-4 w-4 border-2 border-slate-50 border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Class
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
