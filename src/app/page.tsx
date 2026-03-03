import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import * as motion from "framer-motion/client";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-50 to-slate-50"></div>

      <div className="z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center space-y-12">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-6">
            <GraduationCap className="w-10 h-10 text-slate-900" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
            Playbook <span className="text-slate-400 font-light">Lite</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-light leading-relaxed">
            The intelligent grading infrastructure for modern education.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
        >
          <Link href="/student" className="group">
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 h-full group-hover:-translate-y-1">
              <Users className="w-8 h-8 text-slate-400 mb-4 group-hover:text-slate-600 transition-colors" />
              <h2 className="text-2xl font-semibold mb-2 text-slate-800">Student Portal</h2>
              <p className="text-slate-500 text-sm mb-6 text-center">Enter your access code to submit assignments and view AI remarks.</p>
              <div className="flex items-center text-sm font-medium text-slate-900 bg-slate-100 px-4 py-2 rounded-full group-hover:bg-slate-200 transition-colors">
                Enter Code <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/dashboard" className="group">
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900 text-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 h-full group-hover:-translate-y-1">
              <GraduationCap className="w-8 h-8 text-slate-300 mb-4 group-hover:text-white transition-colors" />
              <h2 className="text-2xl font-semibold mb-2">Teacher Login</h2>
              <p className="text-slate-400 text-sm mb-6 text-center">Manage classes, configure AI rubrics, and oversee continuous assessments.</p>
              <div className="flex items-center text-sm font-medium text-slate-900 bg-white px-4 py-2 rounded-full group-hover:bg-slate-100 transition-colors">
                Dashboard <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-slate-400 text-sm font-medium mt-16"
        >
          Phase 1 &bull; Mock UI Development
        </motion.div>
      </div>
    </main>
  );
}
