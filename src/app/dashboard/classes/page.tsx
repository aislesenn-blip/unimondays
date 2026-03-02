"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookOpen, Users, MoreVertical } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const CLASSES = [
  { id: 1, name: "Advanced Mathematics", code: "MATH-401", students: 42, assignments: 12, status: "Active", color: "bg-blue-500", light: "bg-blue-50 text-blue-700" },
  { id: 2, name: "Intro to Physics", code: "PHYS-101", students: 120, assignments: 5, status: "Active", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700" },
  { id: 3, name: "Computer Science II", code: "CS-202", students: 85, assignments: 8, status: "Active", color: "bg-purple-500", light: "bg-purple-50 text-purple-700" },
  { id: 4, name: "Data Structures", code: "CS-301", students: 64, assignments: 3, status: "Draft", color: "bg-slate-500", light: "bg-slate-50 text-slate-700" },
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

export default function ClassesOverview() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-6xl mx-auto"
    >
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Classes</h2>
          <p className="text-slate-500 mt-2 text-base font-medium">Manage your active classes and student rosters.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search classes..."
              className="pl-9 bg-white border-slate-200 focus-visible:ring-slate-400 h-11 rounded-xl shadow-sm"
            />
          </div>
          <Link href="/dashboard/classes/new">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 px-6 font-medium shadow-sm hover:shadow-md transition-all shrink-0">
              <Plus className="mr-2 h-4 w-4" /> New Class
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Classes Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CLASSES.map((cls) => (
          <motion.div
            key={cls.id}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group h-full"
          >
            <Link href={`/dashboard/classes/${cls.id}`} className="block h-full">
              <Card className="border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden h-full flex flex-col">
                <div className="h-2 w-full bg-slate-100 relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1/3 ${cls.color}`} />
                </div>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className={`${cls.light} hover:${cls.light} border-none rounded-md px-2.5 py-0.5 font-medium mb-3`}>
                      {cls.code}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="text-xl font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{cls.name}</h3>
                  <div className="flex items-center gap-2 mb-6">
                     <span className="flex items-center text-xs font-medium text-slate-500">
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${cls.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {cls.status}
                     </span>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-50 rounded-md text-slate-500">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Students</span>
                        <span className="text-sm font-semibold text-slate-900">{cls.students}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-50 rounded-md text-slate-500">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Work</span>
                        <span className="text-sm font-semibold text-slate-900">{cls.assignments}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
