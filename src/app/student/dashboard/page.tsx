"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SESSIONS, WORKS, SUBMISSIONS } from "@/lib/mock-data";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  FileText
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const studentSubmissions = SUBMISSIONS.filter(s => s.studentId === "student_1");

  const handleStart = () => {
    if (code.trim()) {
      router.push(`/student/assessment/${code.toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Code Input */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-card p-6 md:p-8 rounded-2xl shadow-sm border animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, Baraka</h1>
          <p className="text-muted-foreground text-lg">Ready to take an assessment?</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-3">
           <Input
             placeholder="Enter Work Code (e.g. WK-X92B)"
             className="md:w-72 font-mono uppercase h-12 text-lg tracking-widest placeholder:tracking-normal"
             value={code}
             onChange={(e) => setCode(e.target.value)}
             onKeyDown={(e) => e.key === "Enter" && handleStart()}
           />
           <Button size="lg" className="h-12 px-8" onClick={handleStart}>Start</Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">

          {/* Active Works Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">Active Works</h2>
            </div>
            <div className="grid gap-4">
              {[WORKS[0]].map((work) => (
                <Card key={work.id} className="border-l-4 border-l-primary hover:shadow-md transition-all duration-300 group">
                  <CardHeader className="pb-3">
                     <div className="flex justify-between items-start">
                       <div>
                         <CardTitle className="text-xl group-hover:text-primary transition-colors">{work.title}</CardTitle>
                         <CardDescription className="mt-1">CS 101 • Introduction to Computer Science</CardDescription>
                       </div>
                       <span className="text-xs font-bold uppercase tracking-wider bg-secondary px-2 py-1 rounded text-muted-foreground">{work.type}</span>
                     </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Due {new Date(work.dueDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> {work.questionsCount} Questions</span>
                      <span className="flex items-center gap-2 text-emerald-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Open for submission</span>
                    </div>
                    <Button className="w-full md:w-auto" size="lg" onClick={() => router.push(`/student/assessment/WK-${work.id}`)}>
                      Continue Assessment <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Past Results Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">Recent Results</h2>
              <Button variant="link" className="text-primary">View All</Button>
            </div>
            <div className="space-y-4">
               {studentSubmissions.map((sub) => (
                 <Card key={sub.id} className="hover:bg-muted/30 transition-colors border-l-4 border-l-emerald-500">
                   <div className="flex flex-col md:flex-row md:items-center">
                     <div className="flex-1 p-6">
                       <div className="flex justify-between items-start mb-2">
                         <div>
                           <h3 className="font-semibold text-lg">{sub.workId === 'work_1' ? 'Mid-Semester Quiz 1' : 'Assignment 1'}</h3>
                           <p className="text-sm text-muted-foreground">Submitted {new Date(sub.submittedAt).toLocaleDateString()}</p>
                         </div>
                         <div className="text-right md:hidden">
                           <div className="text-2xl font-bold text-primary">{sub.score}%</div>
                           <div className="text-xs font-bold text-emerald-600">Grade: A</div>
                         </div>
                       </div>
                       <div className="flex gap-3 mt-4">
                         <Button variant="outline" size="sm" className="h-9">View Script</Button>
                         <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-primary">
                           <Sparkles className="mr-1 h-3 w-3" /> AI Insights
                         </Button>
                       </div>
                     </div>
                     <div className="hidden md:flex flex-col items-center justify-center p-6 border-l w-32 bg-secondary/10">
                       <div className="text-3xl font-bold text-primary">{sub.score}</div>
                       <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Score</div>
                     </div>
                   </div>
                 </Card>
               ))}
            </div>
          </section>
        </div>

        {/* Sidebar / Upsell */}
        <div className="space-y-6">
           <Card className="bg-primary text-primary-foreground border-0 shadow-xl relative overflow-hidden">
             <div className="absolute -top-12 -right-12 p-4 opacity-10">
               <Sparkles className="h-48 w-48 text-white animate-pulse" />
             </div>
             <CardHeader className="relative z-10 pb-2">
               <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                 <Sparkles className="h-6 w-6 text-yellow-300" />
               </div>
               <CardTitle className="text-xl">Student Pro</CardTitle>
               <CardDescription className="text-primary-foreground/80">
                 Unlock AI study insights and instant appeals.
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6 relative z-10">
               <ul className="space-y-3 text-sm">
                 <li className="flex items-center gap-3">
                   <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-emerald-300" /></div>
                   AI Performance Analysis
                 </li>
                 <li className="flex items-center gap-3">
                   <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-emerald-300" /></div>
                   Priority Appeal Handling
                 </li>
                 <li className="flex items-center gap-3">
                   <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-emerald-300" /></div>
                   Unlimited Storage
                 </li>
               </ul>
               <div className="pt-2">
                 <div className="text-3xl font-bold">3,500<span className="text-sm font-normal opacity-70 ml-1">TZS/mo</span></div>
               </div>
               <Button className="w-full bg-white text-primary hover:bg-gray-100 font-bold h-11 border-0">
                 Upgrade Now
               </Button>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="w-full bg-secondary h-2 rounded-full mb-2 overflow-hidden">
                 <div className="bg-primary h-2 rounded-full w-[75%]" />
               </div>
               <div className="flex justify-between text-xs text-muted-foreground">
                 <span>750MB used</span>
                 <span>1GB Limit</span>
               </div>
               <Button variant="link" className="px-0 text-xs h-auto mt-2 text-primary">Manage Files</Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
