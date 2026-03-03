"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, UploadCloud, Calendar as CalendarIcon, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function NewWorkPage({ params }: { params: { id: string } }) {
  const [date, setDate] = useState<Date>();
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setFileUploaded(true);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/classes/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Create New Assignment</h2>
          <p className="text-slate-500 mt-1">Configure details and upload your marking scheme.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left Column: Form Details */}
        <div className="md:col-span-2 space-y-8">
          <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-6 pt-8 px-8 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xl font-semibold text-slate-900">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-semibold text-slate-700">Assignment Title <span className="text-red-500">*</span></Label>
                <Input id="title" placeholder="e.g. Midterm Examination Phase 1" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-slate-400 focus-visible:bg-white transition-colors" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white justify-start text-left font-normal",
                          !date && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="totalMarks" className="text-sm font-semibold text-slate-700">Total Marks</Label>
                  <Input id="totalMarks" type="number" placeholder="100" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-slate-400 focus-visible:bg-white transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-6 pt-8 px-8 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Marking Scheme / Rubric</CardTitle>
                <CardDescription className="text-slate-500 mt-1">Upload your criteria for AI standardization.</CardDescription>
              </div>
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent className="p-8">
              {!fileUploaded ? (
                <div
                  onClick={handleUpload}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                >
                  <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    {isProcessing ? (
                      <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UploadCloud className="h-7 w-7 text-indigo-500" />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    {isProcessing ? "Analyzing Rubric with AI..." : "Click to upload marking scheme"}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-[250px]">
                    {isProcessing ? "Extracting semantic criteria..." : "PDF, DOCX, or text files up to 10MB"}
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-emerald-900">Rubric Standardized Successfully</h3>
                    <p className="text-sm text-emerald-700 mt-1">AI has extracted 14 marking criteria and 3 evaluation tiers from &quot;MATH401_Midterm_Rubric.pdf&quot;.</p>
                    <Button variant="link" className="text-emerald-700 p-0 h-auto mt-2 font-semibold">View extracted rubric →</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-8">
          <Card className="border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden sticky top-24">
            <CardHeader className="pb-6 pt-8 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-900">Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              <div className="space-y-4">
                <Label className="text-sm font-semibold text-slate-700">Results Release Mode</Label>
                <Select defaultValue="manual">
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-slate-400 focus:bg-white transition-colors">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="manual">Manual (Teacher Review)</SelectItem>
                    <SelectItem value="auto">Automatic (Instant)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 leading-relaxed">Manual mode requires you to approve AI grades before students see them.</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-slate-700">Late Submissions</Label>
                    <p className="text-xs text-slate-500">Allow after deadline</p>
                  </div>
                  <Switch />
                </div>
              </div>

            </CardContent>
            <CardFooter className="p-6 bg-slate-50 border-t border-slate-100">
              <Button
                disabled={!fileUploaded}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-12 font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Assignment
              </Button>
            </CardFooter>
          </Card>
        </div>

      </div>
    </motion.div>
  );
}
