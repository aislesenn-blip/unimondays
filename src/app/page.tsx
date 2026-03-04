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
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  Upload,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      <Navbar />

      <main className="flex-1 pt-24 md:pt-32">
        {/* Hero Section */}
        <section className="relative px-6 md:px-12 max-w-6xl mx-auto text-center md:text-left pb-24 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-slate-900 leading-[1.1]">
                  Grade with <br />
                  <span className="font-semibold text-slate-900">Precision.</span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-500 max-w-xl font-light leading-relaxed">
                  The enterprise AI grading engine built for modern institutions. Clinical accuracy, complete transparency, zero friction.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-14 px-8 text-base rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                  )}
                >
                  Start Grading Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/student/login"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-14 px-8 text-base rounded-full border-slate-200 text-slate-900 hover:bg-slate-100 transition-colors"
                  )}
                >
                  Student Portal
                </Link>
              </div>
            </div>

            <div className="relative lg:h-[600px] w-full rounded-3xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
               <img
                 src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop"
                 alt="Students in modern workspace"
                 className="absolute inset-0 w-full h-full object-cover grayscale-[20%] transition-transform duration-1000 hover:scale-105 hover:grayscale-0"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"></div>

               {/* Minimalist overlay */}
               <div className="absolute bottom-8 left-8 right-8 z-10 flex justify-end">
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-100 shadow-sm max-w-sm">
                      <div className="flex items-center gap-3 mb-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <div className="font-medium text-sm text-slate-900">Analysis Complete</div>
                      </div>
                      <p className="text-sm font-light text-slate-600">"Exceptional reasoning shown in Question 4. Full marks awarded."</p>
                  </div>
               </div>
            </div>
          </div>
        </section>

        <div className="w-full h-[1px] bg-slate-200 max-w-6xl mx-auto"></div>

        {/* The Engine Section */}
        <section className="py-24 md:py-32 bg-slate-50">
            <div className="max-w-6xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900">The Grading Engine</h2>
                            <p className="text-lg text-slate-500 font-light leading-relaxed">
                                Upload a massive PDF of student scripts. Our infrastructure automatically slices, reads, and precisely maps answers to your exact standardized rubric.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <div className="flex gap-6 group">
                                <div className="text-slate-300 group-hover:text-slate-900 transition-colors">
                                    <Upload strokeWidth={1} className="h-8 w-8" />
                                </div>
                                <div className="space-y-1 pt-1">
                                    <h3 className="font-medium text-lg text-slate-900">Direct Upload</h3>
                                    <p className="text-slate-500 text-base font-light">Secure, fast ingest of raw documents directly to isolated enterprise buckets.</p>
                                </div>
                            </div>

                            <div className="flex gap-6 group">
                                <div className="text-slate-300 group-hover:text-slate-900 transition-colors">
                                    <Zap strokeWidth={1} className="h-8 w-8" />
                                </div>
                                <div className="space-y-1 pt-1">
                                    <h3 className="font-medium text-lg text-slate-900">Deterministic Extraction</h3>
                                    <p className="text-slate-500 text-base font-light">Answers are parsed and evaluated strictly according to the tier-based rules you define.</p>
                                </div>
                            </div>

                            <div className="flex gap-6 group">
                                <div className="text-slate-300 group-hover:text-slate-900 transition-colors">
                                    <FileText strokeWidth={1} className="h-8 w-8" />
                                </div>
                                <div className="space-y-1 pt-1">
                                    <h3 className="font-medium text-lg text-slate-900">Granular Audit Trail</h3>
                                    <p className="text-slate-500 text-base font-light">Every mark awarded is linked to a specific quote from the student's submission.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-[600px] rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center p-8">
                        {/* Abstract representation of the engine */}
                        <div className="w-full max-w-md space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400 font-medium tracking-wider uppercase">
                                    <span>Processing Queue</span>
                                    <span className="text-emerald-500">Active</span>
                                </div>
                                <div className="h-[1px] w-full bg-slate-100"></div>
                            </div>

                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 py-3">
                                    <div className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 shrink-0">
                                        <FileText strokeWidth={1} className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="h-2 w-24 bg-slate-200 rounded-full"></div>
                                            <div className="h-2 w-8 bg-slate-200 rounded-full"></div>
                                        </div>
                                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                            {i === 1 && <div className="h-full bg-slate-900 w-full"></div>}
                                            {i === 2 && <div className="h-full bg-slate-900 w-3/4 animate-pulse"></div>}
                                            {i === 3 && <div className="h-full bg-emerald-500 w-1/4 animate-pulse"></div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <div className="w-full h-[1px] bg-slate-200 max-w-6xl mx-auto"></div>

        {/* Features Section */}
        <section className="py-24 md:py-32 bg-slate-50">
             <div className="max-w-6xl mx-auto px-6 md:px-12">
                <div className="mb-20">
                    <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 mb-4">Uncompromising Architecture</h2>
                    <p className="text-xl text-slate-500 font-light max-w-2xl">
                        Designed for scale, built for trust.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                    {[
                    {
                        icon: BrainCircuit,
                        title: "Multi-Model Orchestration",
                        desc: "Flash for extraction, Haiku for parsing, DeepSeek for deterministic reasoning. The right tool for the right job."
                    },
                    {
                        icon: ShieldCheck,
                        title: "Strict Hierarchical Logic",
                        desc: "Grades strictly via exact match, equivalent concept, or partial match. Zero hallucinated leniency."
                    },
                    {
                        icon: BarChart2,
                        title: "Asynchronous Scale",
                        desc: "Powered by enterprise job queues. Submit thousands of scripts without UI timeouts or hanging states."
                    },
                    {
                        icon: Code,
                        title: "WorkCode Distribution",
                        desc: "Frictionless student access. Generate a WorkSession code and distribute it instantly."
                    },
                    {
                        icon: CheckCircle2,
                        title: "Instant Verification",
                        desc: "Low-confidence grades trigger automatic review flags for manual lecturer calibration."
                    },
                    {
                        icon: Download,
                        title: "Departmental Export",
                        desc: "Single-click extraction of formatted Excel sheets containing complete score breakdowns and evidence."
                    }
                    ].map((feature, idx) => (
                    <div key={idx} className="group">
                        <div className="mb-5 text-slate-400 group-hover:text-slate-900 transition-colors duration-300">
                            <feature.icon strokeWidth={1} className="h-8 w-8" />
                        </div>
                        <h3 className="font-medium text-lg text-slate-900 mb-2">{feature.title}</h3>
                        <p className="text-slate-500 font-light leading-relaxed">{feature.desc}</p>
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
