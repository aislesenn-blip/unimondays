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
import { ArrowLeft, Loader2, Copy, FileText, Calendar, Clock, Lock, Users, Upload, PenTool, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { SESSIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function CreateWorkPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const session = SESSIONS.find(s => s.id === sessionId);

  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState("upload");
  const [isGroupWork, setIsGroupWork] = useState(false);

  // Calibration State
  const [languageStrictness, setLanguageStrictness] = useState(false);

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
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
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
        <Tabs defaultValue="upload" className="space-y-6" onValueChange={setWorkMode}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" /> Upload / Physical
              </TabsTrigger>
              <TabsTrigger value="digital">
                <PenTool className="mr-2 h-4 w-4" /> Digital Creation
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2 border px-3 py-1.5 rounded-lg bg-background">
               <Switch
                 id="group-mode"
                 checked={isGroupWork}
                 onCheckedChange={setIsGroupWork}
               />
               <Label htmlFor="group-mode" className="cursor-pointer flex items-center gap-2 font-medium">
                 <Users className="h-4 w-4 text-muted-foreground" /> Group Work
               </Label>
            </div>
          </div>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Assessment Materials</CardTitle>
                <CardDescription>Upload PDF question papers or scanned scripts for students to reference.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">Drag & drop files here</h3>
                  <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, or Images up to 10MB</p>
                  <Button variant="secondary" className="mt-4" onClick={() => alert('File picker mock')}>Select Files</Button>
                </div>

                <div className="grid gap-4">
                  <Label>Label As</Label>
                  <RadioGroup defaultValue="quiz" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quiz" id="u-quiz" />
                      <Label htmlFor="u-quiz">Quiz</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exam" id="u-exam" />
                      <Label htmlFor="u-exam">Exam</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="assignment" id="u-assignment" />
                      <Label htmlFor="u-assignment">Assignment</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digital" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Digital Editor</CardTitle>
                <CardDescription>Compose your assessment directly in the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Instructions / Preamble</Label>
                  <div className="min-h-[150px] border rounded-md p-4 bg-muted/10 font-mono text-sm text-muted-foreground">
                    [Rich Text Editor Placeholder]
                    <br/><br/>
                    • Bold, Italic, Lists support...
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Questions</Label>
                    <Button size="sm" variant="outline" onClick={() => alert('Add question mock')}><Plus className="mr-2 h-3 w-3" /> Add Question</Button>
                  </div>

                  {/* Mock Question Item */}
                  <div className="border rounded-lg p-4 space-y-3 relative group">
                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm shrink-0">1</div>
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Enter question text..." defaultValue="Explain the significance of the 1964 Union." />
                        <div className="flex gap-4">
                           <Input type="number" placeholder="Marks" className="w-24" />
                           <Select>
                               <option value="essay">Essay</option>
                               <option value="short">Short Answer</option>
                               <option value="mcq">Multiple Choice</option>
                           </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rubric Builder Section */}
        <Card className="border-l-4 border-l-blue-500">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <FileText className="h-5 w-5 text-blue-600" />
               Marking Scheme / Rubric
             </CardTitle>
             <CardDescription>Provide the correct answers or grading guide for DeepSeek to use.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid w-full gap-2">
               <Label htmlFor="rubric-text">Rubric Content</Label>
               <Textarea
                 id="rubric-text"
                 placeholder="Paste your marking scheme, key facts, or model answers here..."
                 className="min-h-[150px] font-mono text-sm"
               />
             </div>
             <div className="flex items-center gap-4">
               <div className="text-xs text-muted-foreground uppercase font-bold">OR</div>
               <Button variant="outline" size="sm" onClick={() => alert('Rubric upload mock')}>
                 <Upload className="mr-2 h-3 w-3" /> Upload Rubric Document
               </Button>
             </div>
           </CardContent>
        </Card>

        {/* Common Settings & Calibration */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Work Title</Label>
                <Input id="title" placeholder="e.g. Mid-Semester Quiz 1" required />
              </div>
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
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle>Settings & Calibration</CardTitle>
              <CardDescription>Fine-tune how the AI grades this work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Methodology & Steps */}
              <div className="space-y-2">
                <Label>Methodology & Steps</Label>
                <Select defaultValue="partial">
                    <option value="partial">Award partial marks for correct steps (Lenient)</option>
                    <option value="strict">Strict final answer only (0 if wrong)</option>
                </Select>
              </div>

              {/* Grammar & Language Focus */}
               <div className="space-y-2">
                <Label>Grammar & Language Focus</Label>
                <Select defaultValue="ignore">
                    <option value="ignore">Ignore grammar; focus on facts</option>
                    <option value="deduct">Deduct marks for poor grammar</option>
                </Select>
              </div>

              {/* Verbosity */}
               <div className="space-y-2">
                <Label>Verbosity & Rambling</Label>
                <Select defaultValue="core">
                    <option value="core">Find core fact, ignore noise</option>
                    <option value="penalize">Penalize excessive rambling</option>
                </Select>
              </div>

              {/* Language Strictness */}
              <div className="flex flex-col gap-2 border p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lang-strict" className="cursor-pointer font-medium">Enforce Strict Language</Label>
                  <Switch
                    id="lang-strict"
                    checked={languageStrictness}
                    onCheckedChange={setLanguageStrictness}
                  />
                </div>
                {languageStrictness && (
                   <Input placeholder="Penalty (e.g. -2 marks or 0)" className="mt-2 h-8 text-sm" />
                )}
                <p className="text-xs text-muted-foreground">If ON, penalizes use of Swahili/Vernacular in English exams.</p>
              </div>

               {/* Custom Prompt */}
               <div className="space-y-2">
                 <Label>Custom AI Grading Instructions (Optional)</Label>
                 <Textarea
                   placeholder="e.g. The student MUST explicitly mention 'E=mc^2'..."
                   className="h-20 text-sm"
                 />
               </div>

              {/* Existing Settings */}
              <div className="pt-4 border-t space-y-4">
                 <div className="flex items-center justify-between space-x-2">
                   <Label htmlFor="timer" className="text-sm text-muted-foreground">Timer (Minutes)</Label>
                   <Input id="timer" type="number" placeholder="60" className="w-20 h-8" />
                 </div>
                 <div className="flex items-center justify-between space-x-2">
                   <Label htmlFor="auto-release" className="cursor-pointer text-sm text-muted-foreground">Auto Release Grades</Label>
                   <Switch id="auto-release" />
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
