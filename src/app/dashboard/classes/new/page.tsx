"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NewClassPage() {
  return (
    <motion.div
      initial={{ opacity: 1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <Link href="/dashboard/classes">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Create New Class</h2>
          <p className="text-slate-500 mt-1">Set up a new workspace for your students.</p>
        </div>
      </div>

      <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-6 pt-8 px-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900">Class Details</CardTitle>
              <CardDescription className="text-slate-500 mt-1">Basic information about the course.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="className" className="text-sm font-semibold text-slate-700">Class Name <span className="text-red-500">*</span></Label>
              <Input id="className" placeholder="e.g. Advanced Mathematics" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-slate-400 focus-visible:bg-white transition-colors" />
            </div>

            <div className="space-y-3">
              <Label htmlFor="classCode" className="text-sm font-semibold text-slate-700">Course Code</Label>
              <Input id="classCode" placeholder="e.g. MATH-401" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-slate-400 focus-visible:bg-white transition-colors" />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the course curriculum and objectives..."
              className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-slate-400 focus-visible:bg-white transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="gradeLevel" className="text-sm font-semibold text-slate-700">Grade Level</Label>
              <Select>
                <SelectTrigger id="gradeLevel" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-slate-400 focus:bg-white transition-colors">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="freshman">Freshman (Year 1)</SelectItem>
                  <SelectItem value="sophomore">Sophomore (Year 2)</SelectItem>
                  <SelectItem value="junior">Junior (Year 3)</SelectItem>
                  <SelectItem value="senior">Senior (Year 4)</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="semester" className="text-sm font-semibold text-slate-700">Semester</Label>
              <Select>
                <SelectTrigger id="semester" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-slate-400 focus:bg-white transition-colors">
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="fall">Fall 2024</SelectItem>
                  <SelectItem value="spring">Spring 2025</SelectItem>
                  <SelectItem value="summer">Summer 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </CardContent>
        <CardFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl px-6">Cancel</Button>
          <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 px-8 font-medium shadow-sm hover:shadow-md transition-all">
            <Sparkles className="mr-2 h-4 w-4" /> Create Class & Generate Code
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
