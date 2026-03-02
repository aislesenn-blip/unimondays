"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CreateAssignment() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ title: "", class: "MATH-401", marks: "100" });
  const [rubricUploaded, setRubricUploaded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRubricUploaded(true);
  };

  const handleSimulateStandardization = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setStep(3); // Move to review step
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl luxury-heading">New Assignment</h2>
          <p className="text-muted-foreground mt-1 font-medium">Configure tasks and train the AI grading brain.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-2 w-16 rounded-full transition-all duration-500 ${step >= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="luxury-glass">
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
                <CardDescription>Basic metadata for the new task.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Midterm Examination 2024"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="class">Target Class</Label>
                    <Input id="class" defaultValue={formData.class} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marks">Total Marks</Label>
                    <Input id="marks" type="number" value={formData.marks} onChange={e => setFormData({ ...formData, marks: e.target.value })} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/40 pt-6">
                <Button onClick={() => setStep(2)} disabled={!formData.title}>
                  Next: Upload Rubric <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="luxury-glass">
              <CardHeader>
                <CardTitle>Train the Brain</CardTitle>
                <CardDescription>Upload your marking scheme. The AI will extract and standardise it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-center">

                <div
                  className={`border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ${rubricUploaded ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/20 cursor-pointer"}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => setRubricUploaded(true)}
                >
                  {rubricUploaded ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                      <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4 text-success shadow-lg shadow-success/10">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h4 className="text-xl font-bold tracking-tight text-foreground">Marking Scheme Uploaded</h4>
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                         <FileText className="h-4 w-4" /> math_401_rubric_final.pdf
                      </p>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                         <UploadCloud className="h-8 w-8" />
                      </div>
                      <h4 className="text-xl font-bold tracking-tight text-foreground">Drag & Drop Rubric</h4>
                      <p className="text-sm text-muted-foreground mt-2">PDF, DOCX, or Excel</p>
                    </div>
                  )}
                </div>

                {rubricUploaded && (
                  <Button
                    size="lg"
                    className="w-full sm:w-auto mt-6 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20"
                    onClick={handleSimulateStandardization}
                    disabled={simulating}
                  >
                    {simulating ? "AI Standardizing Rubric..." : "Extract & Standardize Rubric"}
                  </Button>
                )}

              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="luxury-glass">
              <CardHeader>
                <CardTitle>AI Standardization Complete</CardTitle>
                <CardDescription>The brain has mapped your rubric into deterministic grading tiers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="rounded-2xl border border-border/60 bg-background/50 backdrop-blur overflow-hidden divide-y divide-border/40">
                  {[
                    { q: "Q1. Integration by Parts", marks: 15, tiers: 4 },
                    { q: "Q2. Vector Calculus", marks: 25, tiers: 5 },
                    { q: "Q3. Differential Equations", marks: 60, tiers: 6 },
                  ].map(item => (
                    <div key={item.q} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                       <div className="font-semibold">{item.q}</div>
                       <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <span>{item.tiers} Evaluative Tiers Map</span>
                         <span className="font-bold text-foreground bg-muted px-3 py-1 rounded-full">{item.marks} marks</span>
                       </div>
                    </div>
                  ))}
                </div>

              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t border-border/40 pt-6">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => router.push('/dashboard/assignments/sim1/grading')} className="bg-foreground text-background">
                  Confirm & Go to Grading
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}