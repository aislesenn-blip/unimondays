"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BrainCircuit, CheckCircle2, FileUp, Loader2, Settings, UploadCloud, FileText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Step = "details" | "upload" | "standardize" | "settings";

export default function CreateWorkPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [assignmentName, setAssignmentName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [deadline, setDeadline] = useState("");

  const handleNext = (nextStep: Step) => {
    if (currentStep === "details" && !assignmentName) {
      toast.error("Please enter an assignment name");
      return;
    }
    setCurrentStep(nextStep);
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      handleNext("standardize");
      simulateStandardization();
    }, 1500);
  };

  const simulateStandardization = () => {
    setIsStandardizing(true);
    setTimeout(() => {
      setIsStandardizing(false);
      toast.success("AI successfully extracted and standardized the marking scheme");
      handleNext("settings");
    }, 2500);
  };

  const handlePublish = () => {
    if (!deadline) {
      toast.error("Please select a deadline");
      return;
    }
    toast.success("Assignment created successfully");
    router.push(`/dashboard/classes/${classId}`);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-8 flex justify-center items-start">
      <div className="w-full max-w-3xl mt-4">

        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4 -ml-4 text-slate-500 hover:text-slate-900">
            <Link href={`/dashboard/classes/${classId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Class
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Create Assignment</h1>
              <p className="text-slate-500 mt-1">Upload your marking scheme and let AI standardise it.</p>
            </div>

            {/* Progress Steps Indicator */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === "details" ? "bg-slate-900 text-white" : "bg-green-100 text-green-700"}`}>1</div>
              <div className="w-8 h-px bg-slate-200"></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${["upload", "standardize"].includes(currentStep) ? "bg-slate-900 text-white" : currentStep === "settings" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>2</div>
              <div className="w-8 h-px bg-slate-200"></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === "settings" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>3</div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">

            {/* STEP 1: Details */}
            {currentStep === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Assignment Details
                    </CardTitle>
                    <CardDescription>What are we working on today?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Assignment Name</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Midterm Physics Exam"
                        value={assignmentName}
                        onChange={(e) => setAssignmentName(e.target.value)}
                        className="text-lg py-6"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t border-slate-100 rounded-b-xl px-6 py-4 flex justify-end">
                    <Button onClick={() => handleNext("upload")}>Continue to Upload</Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {/* STEP 2: Upload */}
            {currentStep === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UploadCloud className="h-5 w-5 text-indigo-500" />
                      Upload Marking Scheme
                    </CardTitle>
                    <CardDescription>Upload a PDF, Word document, or image of your rubric.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                      onClick={simulateUpload}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                          <h3 className="text-lg font-medium text-slate-900">Uploading Document...</h3>
                          <p className="text-sm text-slate-500 mt-1">Please wait</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileUp className="h-8 w-8 text-indigo-500" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900">Click or drag file to upload</h3>
                          <p className="text-sm text-slate-500 mt-1">Supports PDF, DOCX, PNG, JPG (Max 50MB)</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t border-slate-100 rounded-b-xl px-6 py-4 flex justify-between">
                    <Button variant="ghost" onClick={() => setCurrentStep("details")}>Back</Button>
                    <Button disabled={isUploading} onClick={simulateUpload}>Simulate Upload</Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {/* STEP 3: AI Standardization Loading */}
            {currentStep === "standardize" && (
              <motion.div
                key="standardize"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0"
              >
                <Card className="h-full flex flex-col items-center justify-center text-center p-12 py-24">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20" />
                    <div className="relative bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto border border-blue-100 shadow-sm">
                      <BrainCircuit className="h-10 w-10 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">AI is extracting your rubric</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                    Standardizing the marking scheme into a granular grading model for perfect evaluations.
                  </p>

                  <div className="w-64 h-2 bg-slate-100 rounded-full mt-8 overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* STEP 4: Settings & Publish */}
            {currentStep === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute inset-0"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-slate-700" />
                        Assignment Settings
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Rubric Standardized
                      </div>
                    </CardTitle>
                    <CardDescription>Configure deadlines and student access.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="deadline" className="text-slate-700">Submission Deadline</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="max-w-md"
                      />
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <Label className="text-slate-700">Results Release Mode</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-slate-900 rounded-lg p-4 cursor-pointer bg-slate-50">
                          <h4 className="font-semibold text-slate-900">Automatic</h4>
                          <p className="text-xs text-slate-500 mt-1">Students see AI remarks immediately after submission.</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300">
                          <h4 className="font-medium text-slate-900">Manual Review</h4>
                          <p className="text-xs text-slate-500 mt-1">You review AI remarks before releasing to students.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t border-slate-100 rounded-b-xl px-6 py-4 flex justify-between">
                    <Button variant="ghost" onClick={() => setCurrentStep("upload")}>Back to Upload</Button>
                    <Button onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">Publish Assignment</Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
