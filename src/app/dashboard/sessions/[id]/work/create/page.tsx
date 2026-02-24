"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Copy, FileText, Calendar, Clock, Lock, Users } from "lucide-react";
import Link from "next/link";
import { SESSIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function CreateWorkPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const session = SESSIONS.find(s => s.id === sessionId);

  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setGeneratedCode(`WK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
    }, 1500);
  };

  const handleCopyCode = () => {
    // Mock copy
    alert("Code copied to clipboard!");
  };

  if (generatedCode) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setGeneratedCode(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Work Created Successfully</h1>
        </div>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <FileText className="h-5 w-5" />
              Ready for Distribution
            </CardTitle>
            <CardDescription>
              Share this code with your students to allow them to access the work.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-6xl font-mono font-bold tracking-widest text-foreground select-all">
              {generatedCode}
            </div>
            <Button variant="outline" className="gap-2" onClick={handleCopyCode}>
              <Copy className="h-4 w-4" />
              Copy Code
            </Button>
          </CardContent>
          <CardFooter className="bg-emerald-500/10 border-t border-emerald-500/10">
            <div className="text-sm text-emerald-800 flex items-center gap-2 w-full justify-center">
              <Clock className="h-4 w-4" />
              Expires in 48 hours unless extended.
            </div>
          </CardFooter>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/sessions/${sessionId}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Return to Session
          </Link>
          <Link href={`/dashboard/sessions/${sessionId}`} className={cn(buttonVariants())}>
            Done
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/sessions/${sessionId}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Work</h1>
          <p className="text-muted-foreground">Set up a quiz, exam, or assignment for {session?.courseCode}.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Define the core details of the assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Work Title</Label>
              <Input id="title" placeholder="e.g. Mid-Semester Quiz 1" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select id="type">
                  <option value="quiz">Quiz</option>
                  <option value="exam">Examination</option>
                  <option value="assignment">Assignment</option>
                  <option value="group">Group Work</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mode">Submission Mode</Label>
                <Select id="mode">
                  <option value="online">Online (In-Browser)</option>
                  <option value="upload">File Upload (PDF)</option>
                  <option value="physical">Physical Script Scan</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea id="instructions" placeholder="Enter specific instructions for students..." />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Start Date & Time</Label>
                <div className="flex gap-2">
                  <Input type="date" className="flex-1" />
                  <Input type="time" className="w-32" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Deadline</Label>
                <div className="flex gap-2">
                  <Input type="date" className="flex-1" />
                  <Input type="time" className="w-32" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timer">Timer (Minutes)</Label>
                <Input id="timer" type="number" placeholder="60" />
              </div>

              <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                <Label htmlFor="auto-release" className="flex flex-col space-y-1 cursor-pointer">
                  <span>Auto Release Grades</span>
                  <span className="font-normal text-xs text-muted-foreground">Publish scores immediately after grading.</span>
                </Label>
                <Switch id="auto-release" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calibration & Proctoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                <Label htmlFor="lock-browser" className="flex flex-col space-y-1 cursor-pointer">
                  <span>Lock Browser</span>
                  <span className="font-normal text-xs text-muted-foreground">Prevent tab switching (Online mode only).</span>
                </Label>
                <Switch id="lock-browser" defaultChecked />
              </div>
               <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                <Label htmlFor="swahili-penalty" className="flex flex-col space-y-1 cursor-pointer">
                  <span>Swahili Penalty</span>
                  <span className="font-normal text-xs text-muted-foreground">Deduct points for using Swahili in English exams.</span>
                </Label>
                <Switch id="swahili-penalty" />
              </div>

              <div className="grid gap-2 pt-2">
                <Label>AI Strictness Level</Label>
                <Select defaultValue="balanced">
                  <option value="lenient">Lenient (Focus on key concepts)</option>
                  <option value="balanced">Balanced (Standard academic)</option>
                  <option value="strict">Strict (Exact keywords required)</option>
                </Select>
              </div>

               <div className="grid gap-2 pt-2">
                <Label>Required Format</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="pdf" defaultChecked disabled />
                  <Label htmlFor="pdf">PDF</Label>
                  <Checkbox id="docx" className="ml-4" />
                  <Label htmlFor="docx">DOCX</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pb-12">
          <Link href={`/dashboard/sessions/${sessionId}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </Link>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Create Work & Generate Code"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
