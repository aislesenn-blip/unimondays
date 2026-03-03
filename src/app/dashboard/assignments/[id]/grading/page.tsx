"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, FileSearch, Sparkles, CheckCircle2, ChevronRight, FileCheck2, Loader2, Award, AlertTriangle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL_PAPERS = 42;

export default function GradingBrain() {
  const router = useRouter();
  const [phase, setPhase] = useState<"IDLE" | "PROCESSING" | "COMPLETE">("IDLE");
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState("Extracting Submissions...");

  const simulateGrading = () => {
    setPhase("PROCESSING");
    setProgress(0);

    setTimeout(() => { setActiveStep("Running Vision OCR Models..."); setProgress(25); }, 1500);
    setTimeout(() => { setActiveStep("Mapping Concept Units..."); setProgress(50); }, 3000);
    setTimeout(() => { setActiveStep("Applying Grading Tiers..."); setProgress(75); }, 5000);
    setTimeout(() => { setActiveStep("Synthesizing Feedback..."); setProgress(90); }, 7000);
    setTimeout(() => { setProgress(100); setPhase("COMPLETE"); }, 8500);
  };

  const TIERS = [
    { name: "Excellent", desc: "Demonstrated strong conceptual understanding.", count: 28, color: "text-success bg-success/10 border-success/20", icon: Award },
    { name: "Needs Work", desc: "Partial marks awarded. Missing core logic.", count: 11, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: AlertTriangle },
    { name: "Critical Review", desc: "Failed to meet minimum criteria. Manual review suggested.", count: 3, color: "text-destructive bg-destructive/10 border-destructive/20", icon: XCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl luxury-heading">Playbook Brain</h2>
          <p className="text-muted-foreground mt-1 font-medium">Midterm Examination 2024 • MATH-401</p>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {phase === "IDLE" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <Card className="luxury-glass text-center py-16 px-6">
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                  <div className="h-24 w-24 rounded-full bg-background border border-border flex items-center justify-center relative z-10 shadow-2xl">
                    <BrainCircuit className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-2xl font-bold tracking-tight">Ready to Grade</h3>
                  <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                    The AI has standardized your marking scheme. There are 42 ungraded submissions waiting in the queue.
                  </p>
                </div>
                <Button size="lg" className="h-14 px-8 text-base shadow-xl shadow-primary/20" onClick={simulateGrading}>
                   <Sparkles className="mr-2 h-5 w-5" /> Initialize Neural Grading
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase === "PROCESSING" && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
             <Card className="luxury-glass overflow-hidden relative">
               <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
                  <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
               </div>
               <CardContent className="p-16 flex flex-col items-center justify-center space-y-8 text-center min-h-[400px]">
                  <div className="relative">
                    <Loader2 className="h-20 w-20 text-primary animate-spin opacity-20 absolute" />
                    <BrainCircuit className="h-20 w-20 text-primary relative z-10" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight animate-pulse text-foreground">Processing</h3>
                    <p className="text-lg text-primary font-medium tracking-wide flex items-center justify-center gap-2">
                       {activeStep}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-4 py-1.5 rounded-full inline-block border border-border/40">
                      {progress}% • {Math.floor((progress / 100) * TOTAL_PAPERS)} / {TOTAL_PAPERS} scripts
                    </p>
                  </div>
               </CardContent>
             </Card>
          </motion.div>
        )}

        {phase === "COMPLETE" && (
          <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="space-y-8">

              <Card className="bg-success/5 border-success/20 shadow-xl shadow-success/5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-success/10 blur-3xl -z-10 rounded-full translate-x-1/2 -translate-y-1/2" />
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-success/20 text-success flex items-center justify-center border border-success/30 shadow-inner">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-foreground mb-1">Grading Complete</h3>
                      <p className="text-muted-foreground font-medium">100% of submissions successfully mapped to evaluative tiers.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-success/30 hover:bg-success/10 text-success bg-background/50">
                    View Audit Log
                  </Button>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" /> Evaluation Tiers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {TIERS.map((tier, i) => (
                    <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + (i * 0.1) }}>
                      <Card className={`border hover:shadow-2xl transition-all cursor-pointer h-full backdrop-blur-sm ${tier.color} bg-background/40 hover:bg-background/80`}>
                        <CardContent className="p-6">
                           <div className="flex justify-between items-start mb-6">
                              <div className={`p-3 rounded-xl bg-background shadow-sm border border-border/40 ${tier.color.split(' ')[0]}`}>
                                <tier.icon className="h-6 w-6" />
                              </div>
                              <Badge variant="outline" className="text-lg px-3 py-1 font-bold bg-background/50 backdrop-blur-md border-border/40 shadow-sm">{tier.count}</Badge>
                           </div>
                           <h4 className="font-bold text-xl tracking-tight text-foreground mb-2">{tier.name}</h4>
                           <p className="text-sm text-muted-foreground font-medium leading-relaxed">{tier.desc}</p>

                           <div className="mt-6 flex items-center text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                             Review Submissions <ChevronRight className="ml-1 h-4 w-4" />
                           </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <Button size="lg" className="h-14 px-8 text-base shadow-xl shadow-foreground/10 bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95" onClick={() => router.push('/dashboard/assignments/sim1/approve')}>
                    Continue to Approval <ChevronRight className="ml-2 h-5 w-5" />
                 </Button>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}