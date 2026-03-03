"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, GraduationCap, Briefcase } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl px-6 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Playbook Lite v1.0</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-slate-900 mb-6">
          Intelligence in <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Every Evaluation.</span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-500 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
          The premium AI-powered grading infrastructure for visionary educators and modern students.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
            <Link href="/dashboard" className="block">
              <div className="group h-full p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                  <Briefcase className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Teacher Portal</h3>
                <p className="text-slate-500 font-medium mb-6">Create classes, upload rubrics, and let AI handle the grading.</p>
                <div className="flex items-center text-indigo-600 font-semibold group-hover:gap-2 transition-all">
                  Enter Workspace <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
            <Link href="/student" className="block">
              <div className="group h-full p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                  <GraduationCap className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Student Portal</h3>
                <p className="text-slate-500 font-medium mb-6">Join with an access code, submit work, and view AI feedback.</p>
                <div className="flex items-center text-emerald-600 font-semibold group-hover:gap-2 transition-all">
                  Join Class <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
