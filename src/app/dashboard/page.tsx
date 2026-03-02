"use client";

import { motion } from "framer-motion";
import { Plus, Users, BookOpen, Clock } from "lucide-react";
import Link from "next/link";

const MOCK_CLASSES = [
  { id: "1", name: "Computer Science 101", code: "CS101-FALL", students: 142, assignments: 12, lastActive: "2 hours ago" },
  { id: "2", name: "Advanced Algorithms", code: "CS302-FALL", students: 86, assignments: 8, lastActive: "5 hours ago" },
  { id: "3", name: "Introduction to UI/UX", code: "DES101-FALL", students: 215, assignments: 5, lastActive: "1 day ago" },
];

export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Good morning, Dr. Sarah.</h1>
          <p className="text-slate-500">Here&apos;s an overview of your active classes and recent activity.</p>
        </div>

        <Link
          href="/dashboard/classes/create"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-6 py-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Class
        </Link>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_CLASSES.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link href={`/dashboard/classes/${cls.id}`} className="block h-full">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300 h-full flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{cls.name}</h3>
                    <p className="text-sm font-mono text-slate-500 mt-1">{cls.code}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-auto pt-6 grid grid-cols-2 gap-4 border-t border-slate-100">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Users className="h-3.5 w-3.5" /> Students
                    </div>
                    <span className="font-semibold text-slate-900">{cls.students}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> Last Active
                    </div>
                    <span className="font-medium text-slate-700 text-sm">{cls.lastActive}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
