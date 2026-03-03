"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function StudentAccessPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      router.push(`/student/${code.toUpperCase()}/submit`);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl p-10 shadow-sm border border-slate-200/60"
      >
        <div className="flex flex-col items-center text-center space-y-6 mb-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-2">
            <LockKeyhole className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Student Access</h1>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Enter the 6-character access code provided by your teacher to submit your work.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="sr-only">
              Access Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CS101-F"
              maxLength={6}
              className={`w-full text-center text-2xl tracking-widest uppercase font-mono py-4 px-6 rounded-2xl bg-slate-50 border ${
                error ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:border-slate-400 focus:ring-slate-400"
              } focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-base placeholder:lowercase`}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm text-center mt-3 font-medium"
              >
                Code must be exactly 6 characters.
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center py-4 px-6 bg-slate-900 text-white rounded-2xl font-medium hover:bg-slate-800 transition-all group shadow-sm hover:shadow-md"
          >
            Access Portal
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </motion.div>
    </main>
  );
}
