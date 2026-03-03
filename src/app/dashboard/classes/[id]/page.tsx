"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Plus, Users, BookOpen, Settings, MoreVertical, ArrowLeft, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

const STUDENTS = [
  { id: 1, name: "Alice Johnson", email: "alice.j@student.edu", grade: "94%", trend: "up" },
  { id: 2, name: "Bob Smith", email: "bob.s@student.edu", grade: "88%", trend: "neutral" },
  { id: 3, name: "Charlie Davis", email: "charlie.d@student.edu", grade: "91%", trend: "up" },
  { id: 4, name: "Diana Prince", email: "diana.p@student.edu", grade: "76%", trend: "down" },
  { id: 5, name: "Evan Wright", email: "evan.w@student.edu", grade: "85%", trend: "up" },
];

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 1 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

export default function ClassDetailsPage({ params }: { params: { id: string } }) {
  const accessCode = "MATH-FA24-7X9B";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast.success("Access code copied to clipboard");
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/classes">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Advanced Mathematics</h2>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none rounded-md px-2.5 py-0.5 font-medium">
                MATH-401
              </Badge>
            </div>
            <p className="text-slate-500 text-base font-medium">Fall 2024 Semester</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 bg-white border border-slate-200 pl-4 pr-1.5 py-1.5 rounded-xl shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Access Code</span>
              <span className="text-sm font-semibold text-slate-900 tracking-wide">{accessCode}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Link href={`/dashboard/classes/${params.id}/work/new`}>
            <Button className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 px-6 font-medium shadow-sm hover:shadow-md transition-all">
              <Plus className="mr-2 h-4 w-4" /> Create Work
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="bg-transparent border-b border-slate-200 rounded-none w-full justify-start h-auto p-0 gap-6">
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-2 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 transition-none"
            >
              <Users className="h-4 w-4 mr-2" /> Students
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-2 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 transition-none"
            >
              <BookOpen className="h-4 w-4 mr-2" /> Assignments
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-2 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 transition-none"
            >
              <TrendingUp className="h-4 w-4 mr-2" /> Insights
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-2 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 transition-none"
            >
              <Settings className="h-4 w-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

              <div className="lg:col-span-3">
                <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100 font-semibold tracking-wider">
                        <tr>
                          <th className="px-6 py-4 rounded-tl-2xl">Student</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Overall Grade</th>
                          <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {STUDENTS.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900">{student.name}</div>
                                  <div className="text-slate-500 text-xs mt-0.5">{student.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none">Active</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{student.grade}</span>
                                {student.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <CardTitle className="text-lg font-semibold text-slate-900">Class Average</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900">86.8%</span>
                      <span className="text-sm font-medium text-emerald-600 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" /> +2.4%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <CardTitle className="text-lg font-semibold text-slate-900">Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="space-y-4">
                      {[STUDENTS[0], STUDENTS[2]].map(student => (
                        <div key={student.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium text-slate-700">{student.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{student.grade}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          <TabsContent value="assignments">
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
               <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-slate-400" />
               </div>
               <h3 className="text-lg font-semibold text-slate-900 mb-1">No assignments yet</h3>
               <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first assignment to start evaluating student work with AI.</p>
               <Link href={`/dashboard/classes/${params.id}/work/new`}>
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" /> Create First Assignment
                </Button>
               </Link>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
