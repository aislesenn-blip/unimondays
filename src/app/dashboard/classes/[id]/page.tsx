"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ArrowLeft, BrainCircuit, FileText, Plus, Users } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

const MOCK_CLASS = {
  id: "1",
  name: "Computer Science 101",
  code: "CS101-FALL",
  studentsCount: 32,
  avgScore: 88,
  hardestTopic: "Pointers & Memory",
  assignments: [
    { id: "a1", name: "Midterm Exam", dueDate: "2023-11-15", submitted: 30, total: 32, status: "Graded" },
    { id: "a2", name: "Homework 3: Arrays", dueDate: "2023-10-20", submitted: 32, total: 32, status: "Active" },
  ],
  students: [
    { id: "s1", name: "Alice Smith", email: "alice@example.com", grade: 92 },
    { id: "s2", name: "Bob Jones", email: "bob@example.com", grade: 85 },
    { id: "s3", name: "Charlie Brown", email: "charlie@example.com", grade: 78 },
  ]
};

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.id as string;
  // In a real app, fetch class data using `classId`

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div>
          <Button variant="ghost" asChild className="mb-4 -ml-4 text-slate-500 hover:text-slate-900">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{MOCK_CLASS.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Access Code</span>
                  <span className="font-mono font-bold text-slate-900">{MOCK_CLASS.code}</span>
                  <CopyButton value={MOCK_CLASS.code} className="h-6 w-6 ml-1 -mr-1" />
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Users className="h-4 w-4" />
                  {MOCK_CLASS.studentsCount} Students
                </div>
              </div>
            </div>

            <Button asChild size="lg" className="shadow-sm">
              <Link href={`/dashboard/classes/${classId}/work/create`} className="gap-2">
                <Plus className="h-5 w-5" />
                Create Work
              </Link>
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Class Average</CardTitle>
                <div className="h-8 w-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <span className="font-bold text-sm">%</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{MOCK_CLASS.avgScore}%</div>
                <p className="text-xs text-slate-500 mt-1">+2% from last assignment</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Hardest Topic</CardTitle>
                <BrainCircuit className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-900 truncate">{MOCK_CLASS.hardestTopic}</div>
                <p className="text-xs text-amber-600 mt-1">Requires review</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Active Assignments</CardTitle>
                <FileText className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">1</div>
                <p className="text-xs text-slate-500 mt-1">Due in 3 days</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Assignments and Students Tabs (Mocked as sections for now) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Assignments List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Assignments</h2>
            <div className="space-y-4">
              {MOCK_CLASS.assignments.map((assignment, i) => (
                <Card key={assignment.id} className="hover:border-slate-300 transition-colors cursor-pointer group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{assignment.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 mb-2">
                        {assignment.status}
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {assignment.submitted} / {assignment.total} <span className="text-slate-500 font-normal">Submitted</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Students Roster Snippet */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Students</h2>
              <Button variant="link" className="text-sm h-auto p-0">View All</Button>
            </div>
            <Card>
              <div className="divide-y divide-slate-100">
                {MOCK_CLASS.students.map((student) => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {student.grade}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}