"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const MOCK_CLASSES = [
  { id: "1", name: "Computer Science 101", code: "CS101-FALL", students: 32, avgScore: 88 },
  { id: "2", name: "Data Structures & Algos", code: "CS201-SPR", students: 45, avgScore: 76 },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your classes and assignments.</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/classes/create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Link>
          </Button>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_CLASSES.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <Link href={`/dashboard/classes/${cls.id}`}>
                <Card className="h-full hover:border-slate-300 transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="group-hover:text-blue-600 transition-colors">
                          {cls.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs bg-slate-100 w-fit px-2 py-1 rounded">
                          {cls.code}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">{cls.students} Students</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Avg: {cls.avgScore}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: MOCK_CLASSES.length * 0.1, duration: 0.3 }}
          >
            <Link href="/dashboard/classes/create">
              <Card className="h-full border-dashed border-2 bg-transparent hover:bg-slate-100/50 transition-colors cursor-pointer flex flex-col items-center justify-center p-6 text-slate-500 hover:text-slate-900">
                <Plus className="h-8 w-8 mb-4 text-slate-400" />
                <p className="font-medium">Create New Class</p>
                <p className="text-sm text-center mt-1 text-slate-400">Add a new class and invite students</p>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}