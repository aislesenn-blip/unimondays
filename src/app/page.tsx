import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Code,
  FileText,
  BarChart2,
  ShieldCheck,
  Download,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  Upload,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32 lg:py-40 px-6 md:px-12 max-w-7xl mx-auto text-center md:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                Now Live: Auto-Grading v2.0
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                The Intelligent Dropbox for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">Modern Lecturers.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Stop grading manually. Create a Work Session, upload your Gold Standard Rubric, and let our AI grade hundreds of student submissions in seconds with human-level accuracy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
                <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base rounded-full")}>
                  Start Grading Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/student/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 text-base rounded-full")}>
                  Student Portal
                </Link>
              </div>
            </div>

            <div className="relative lg:h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 border bg-muted/50 flex items-center justify-center">
               {/* Simplified visual representation */}
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 z-0"></div>
               <div className="z-10 text-center space-y-4 p-8">
                  <div className="bg-background rounded-xl shadow-lg p-6 max-w-sm mx-auto border">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">AI</div>
                          <div className="text-left">
                              <div className="font-semibold">Grading Complete</div>
                              <div className="text-xs text-muted-foreground">Just now</div>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <div className="h-2 bg-muted rounded w-3/4"></div>
                          <div className="h-2 bg-muted rounded w-full"></div>
                          <div className="h-2 bg-muted rounded w-5/6"></div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                          <span className="text-sm font-medium text-green-600">Score: 88/100</span>
                          <span className="text-xs bg-secondary px-2 py-1 rounded">View Feedback</span>
                      </div>
                  </div>
                  <div className="text-sm text-muted-foreground">Processed 250 scripts in 3 minutes.</div>
               </div>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section id="how-it-works" className="py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Three Steps to Freedom</h2>
              <p className="text-muted-foreground text-lg">
                Your workflow remains simple. We handle the heavy lifting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="bg-card border rounded-2xl p-8 shadow-sm">
                    <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-6 text-blue-600">
                        <Upload className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">1. Create Session</h3>
                    <p className="text-muted-foreground">Define your class, set a deadline, and upload your marking scheme or rubric.</p>
                </div>
                <div className="bg-card border rounded-2xl p-8 shadow-sm">
                    <div className="mx-auto h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center mb-6 text-violet-600">
                        <Zap className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">2. Students Submit</h3>
                    <p className="text-muted-foreground">Students upload their work (PDF/Images) to your secure digital dropbox using a simple code.</p>
                </div>
                <div className="bg-card border rounded-2xl p-8 shadow-sm">
                    <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">3. AI Grades It</h3>
                    <p className="text-muted-foreground">Review auto-generated scores and feedback. Release results with one click.</p>
                </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24">
             <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight">Built for Production</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    {
                      icon: BrainCircuit,
                      title: "DeepSeek AI Engine",
                      desc: "Powered by advanced LLMs to understand nuance, handwriting, and complex reasoning in student answers."
                    },
                    {
                      icon: FileText,
                      title: "Rubric Alignment",
                      desc: "Upload your exact marking scheme. The AI adheres strictly to your criteria, ensuring fairness."
                    },
                    {
                      icon: ShieldCheck,
                      title: "Academic Integrity",
                      desc: "Audit trails for every submission. Flag suspicious patterns and review original scripts side-by-side."
                    },
                    {
                      icon: BarChart2,
                      title: "Continuous Assessment",
                      desc: "Real-time analytics aggregating student performance across all work sessions in a semester."
                    },
                    {
                      icon: Code,
                      title: "Zero-Setup for Students",
                      desc: "No accounts required for students (optional). They just need the Work Code to submit."
                    },
                    {
                      icon: Download,
                      title: "Bulk Export",
                      desc: "Download all annotated scripts and a master gradebook Excel file for administrative filing."
                    }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex gap-4 items-start p-4 hover:bg-secondary/50 rounded-xl transition-colors">
                      <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed mt-1">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
