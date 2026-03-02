"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Copy, Download, Users, Lock, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STUDENTS = [
  { id: "S101", name: "Alice Chen", score: 95, tier: "Excellent", code: "MATH-401-A9X2" },
  { id: "S102", name: "Bob Smith", score: 82, tier: "Excellent", code: "MATH-401-B7L1" },
  { id: "S103", name: "Charlie Davis", score: 65, tier: "Needs Work", code: "MATH-401-C3K9" },
  { id: "S104", name: "Diana Prince", score: 40, tier: "Critical Review", code: "MATH-401-D2M4" },
];

export default function ApproveAndDistribute() {
  const router = useRouter();
  const [approved, setApproved] = useState(false);
  const [codesGenerated, setCodesGenerated] = useState(false);

  const handleApprove = () => setApproved(true);
  const handleGenerate = () => setCodesGenerated(true);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl luxury-heading">Approval & Distribution</h2>
          <p className="text-muted-foreground mt-1 font-medium">Review AI evaluations and generate student access codes.</p>
        </div>
        {!approved && (
          <Button size="lg" className="bg-success text-success-foreground hover:bg-success/90 shadow-lg shadow-success/20" onClick={handleApprove}>
             <CheckCircle2 className="mr-2 h-5 w-5" /> Approve All Grades
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main List */}
        <Card className="lg:col-span-2 luxury-glass border-border/50 bg-background/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div>
               <CardTitle>Grading Roster</CardTitle>
               <CardDescription>42 Submissions processed.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-border/40">
               {STUDENTS.map((student) => (
                 <div key={student.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                       <span className="font-semibold text-foreground text-lg tracking-tight">{student.name}</span>
                       <span className="text-sm text-muted-foreground font-mono">{student.id}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <div className="flex items-center gap-3">
                         <span className="text-2xl font-bold tracking-tighter">{student.score}</span>
                         <span className="text-muted-foreground font-medium">/ 100</span>
                       </div>
                       <Badge variant="outline" className={`font-semibold bg-background/50 backdrop-blur-md ${
                          student.tier === 'Excellent' ? 'text-success border-success/30' :
                          student.tier === 'Needs Work' ? 'text-amber-500 border-amber-500/30' :
                          'text-destructive border-destructive/30'
                       }`}>
                         {student.tier}
                       </Badge>
                    </div>
                 </div>
               ))}
               <div className="p-6 text-center text-sm text-muted-foreground font-medium bg-muted/10">
                  + 38 more students
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Sidebar Actions */}
        <div className="space-y-6">

           <AnimatePresence>
             {approved && !codesGenerated && (
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                 <Card className="luxury-glass border-primary/30 bg-primary/5">
                   <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                     <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <Lock className="h-8 w-8" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold tracking-tight">Generate Codes</h3>
                       <p className="text-sm text-muted-foreground font-medium mt-1">Create unique, secure access codes for each student to view their AI-annotated script.</p>
                     </div>
                     <Button size="lg" className="w-full shadow-lg shadow-primary/20" onClick={handleGenerate}>
                       <Sparkles className="mr-2 h-4 w-4" /> Generate 42 Codes
                     </Button>
                   </CardContent>
                 </Card>
               </motion.div>
             )}

             {codesGenerated && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                 <Card className="luxury-glass border-success/30 bg-success/5">
                   <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                     <div className="h-16 w-16 rounded-2xl bg-success/20 flex items-center justify-center text-success shadow-inner">
                        <CheckCircle2 className="h-8 w-8" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold tracking-tight text-foreground">Codes Generated</h3>
                       <p className="text-sm text-muted-foreground font-medium mt-1">The system has mapped results to unique codes.</p>
                     </div>

                     <div className="w-full space-y-3 mt-4">
                       <Button variant="outline" className="w-full border-border/60 bg-background/50 hover:bg-background/80">
                         <Download className="mr-2 h-4 w-4" /> Export CSV
                       </Button>
                       <Button className="w-full bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/10">
                         <Send className="mr-2 h-4 w-4" /> Send via Email
                       </Button>
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             )}
           </AnimatePresence>

           <Card className="luxury-glass border-border/40">
             <CardHeader>
               <CardTitle className="text-lg">Class Summary</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 text-sm font-medium">
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Total Processed</span>
                  <span className="font-bold text-foreground text-base">42</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Class Average</span>
                  <span className="font-bold text-success text-base">78.4%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Manual Overrides</span>
                  <span className="font-bold text-foreground text-base">0</span>
                </div>
             </CardContent>
           </Card>

        </div>

      </div>
    </div>
  );
}