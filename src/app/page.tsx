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
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32 lg:py-40 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                Now available for Enterprise
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                The Institutional Standard for <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Academic Assessment.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Playbook Ecosystem integrates precision grading, secure exam management, and AI-driven analytics into one unified platform for modern universities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base rounded-full")}>
                  Start as Lecturer <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/student/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 text-base rounded-full")}>
                  Student Access
                </Link>
              </div>
            </div>

            <div className="relative lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent z-10"></div>
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000"
                alt="University Collaboration"
                className="object-cover w-full h-full transform hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section id="outcomes" className="py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Institutional-Grade Capabilities</h2>
              <p className="text-muted-foreground text-lg">
                Designed for high-stakes environments where accuracy, speed, and integrity are non-negotiable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Code,
                  title: "Quiz Code Engine",
                  desc: "Secure, randomized assessment generation with instant code distribution for students."
                },
                {
                  icon: BrainCircuit,
                  title: "AI Grading & Audit",
                  desc: "Dual-layer AI architecture provides human-level grading accuracy with full audit trails."
                },
                {
                  icon: BarChart2,
                  title: "Analytics & Performance",
                  desc: "Real-time insights into student performance, question difficulty, and class trends."
                },
                {
                  icon: FileText,
                  title: "Executive Summaries",
                  desc: "Automated qualitative reports for HODs and Deans generated from grading data."
                },
                {
                  icon: MessageSquare,
                  title: "Appeals System",
                  desc: "Streamlined dispute resolution workflow connecting students directly to markers."
                },
                {
                  icon: Download,
                  title: "Export & Reports",
                  desc: "One-click generation of Excel gradebooks and formatted PDF reports."
                }
              ].map((feature, idx) => (
                <div key={idx} className="bg-card border rounded-2xl p-8 hover:shadow-lg transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
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
