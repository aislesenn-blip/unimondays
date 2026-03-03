"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, Activity, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const STATS = [
  { label: "Active Classes", value: "4", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Pending Grading", value: "128", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "AI Processed", value: "3,402", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
];

const RECENT_CLASSES = [
  { id: 1, name: "Advanced Mathematics", code: "MATH-401", students: 42, status: "Active" },
  { id: 2, name: "Intro to Physics", code: "PHYS-101", students: 120, status: "Active" },
  { id: 3, name: "Computer Science II", code: "CS-202", students: 85, status: "Active" },
];

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 1 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

export default function DashboardOverview() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 max-w-6xl mx-auto"
    >
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-900">Welcome back, Sarah.</h2>
          <p className="text-slate-500 mt-2 text-base font-medium">You have 128 submissions waiting for AI evaluation.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-6 font-medium shadow-sm transition-all">
            View Reports
          </Button>
          <Link href="/dashboard/classes/new">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 px-6 font-medium shadow-sm hover:shadow-md transition-all">
              <Plus className="mr-2 h-4 w-4" /> Create Class
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1 tracking-wide uppercase">{stat.label}</p>
                  <p className="text-4xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                </div>
                <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Classes List */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-6 pt-8 px-8 border-b border-slate-100">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Active Classes</CardTitle>
                <CardDescription className="text-slate-500 mt-1">Your current semester overview.</CardDescription>
              </div>
              <Link href="/dashboard/classes">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg">View All</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {RECENT_CLASSES.map((cls) => (
                  <Link href={`/dashboard/classes/${cls.id}`} key={cls.id}>
                    <div className="group flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-semibold text-lg border border-slate-200/50 group-hover:scale-105 transition-transform">
                          {cls.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{cls.name}</p>
                          <p className="text-sm text-slate-500 font-medium mt-0.5">{cls.code} • {cls.students} Students</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none rounded-md px-2.5 py-0.5 font-medium">
                          {cls.status}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors group-hover:translate-x-1 duration-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions / Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl h-full">
            <CardHeader className="pb-6 pt-8 px-8 border-b border-slate-100">
              <CardTitle className="text-xl font-semibold text-slate-900">AI Assistant</CardTitle>
              <CardDescription className="text-slate-500 mt-1">Playbook insights & tasks.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-1.5">Rubric Optimization</p>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">I noticed your MATH-401 rubric could use more granular tiers for partial credit. Would you like me to restructure it?</p>
                    <Button size="sm" className="w-full text-sm font-medium bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm rounded-lg h-9">
                      Optimize Rubric
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Recent Activity</h4>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <span className="text-sm text-slate-600 leading-relaxed">Graded 42 scripts for <strong className="text-slate-900 font-semibold">CS-202</strong></span>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <span className="text-sm text-slate-600 leading-relaxed">Flagged 3 scripts for review in <strong className="text-slate-900 font-semibold">PHYS-101</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
