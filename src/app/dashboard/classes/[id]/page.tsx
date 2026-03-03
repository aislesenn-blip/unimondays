"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Clock, Copy, Plus, Users, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const MOCK_CLASS = {
  id: "1",
  name: "Computer Science 101",
  code: "CS101-FALL",
  students: 142,
  average: "84.5%",
  hardestTopic: "Pointers & Memory",
  assignments: [
    { id: "a1", title: "Midterm Examination", status: "Graded", date: "Oct 12", avgScore: "78%" },
    { id: "a2", title: "Assignment 3: Data Structures", status: "Grading (AI)", date: "Oct 24", avgScore: "-" },
    { id: "a3", title: "Quiz 4: Recursion", status: "Active", date: "Nov 02", avgScore: "-" },
  ]
};

export default function ClassDetailPage() {
  const params = useParams();

  return (
    <div className="flex flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{MOCK_CLASS.name}</h1>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold font-mono text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
                {MOCK_CLASS.code}
              </span>
            </div>
            <p className="text-slate-500">Manage students, assignments, and AI grading workflows.</p>
          </div>

          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 text-slate-900 h-10 px-4 py-2 shadow-sm">
              <Copy className="h-4 w-4" />
              Copy Access Code
            </button>
            <Link
              href={`/dashboard/classes/${params.id}/work/create`}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-6 py-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create Work
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
            <Users className="h-4 w-4 text-slate-400" /> Total Students
          </div>
          <div className="text-3xl font-bold text-slate-900">{MOCK_CLASS.students}</div>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="h-3 w-3" /> +12 this week
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" /> Class Average
          </div>
          <div className="text-3xl font-bold text-slate-900">{MOCK_CLASS.average}</div>
          <p className="text-xs text-slate-500 mt-1">Across all graded work</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-2 lg:col-span-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-orange-50/50 to-transparent pointer-events-none z-0" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> AI Insights: Hardest Topic
              </div>
              <div className="text-2xl font-bold text-slate-900">{MOCK_CLASS.hardestTopic}</div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-sm">
                Playbook AI detected a 42% failure rate on Question 4 regarding memory allocation in the recent Midterm.
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 text-orange-600 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Assignments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Assignments & Work</h2>
          <span className="text-sm text-slate-500 font-medium">3 Active</span>
        </div>
        <div className="divide-y divide-slate-100">
          {MOCK_CLASS.assignments.map((work) => (
            <div key={work.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{work.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {work.date}</span>
                    <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Avg: {work.avgScore}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm border ${
                  work.status === 'Graded' ? 'bg-green-50 text-green-700 border-green-200' :
                  work.status === 'Grading (AI)' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {work.status === 'Grading (AI)' && <Sparkles className="h-3 w-3 mr-1.5" />}
                  {work.status}
                </span>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50">
                  View Results
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
