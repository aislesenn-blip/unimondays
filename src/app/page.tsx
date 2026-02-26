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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Empower Your Teaching with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">Intelligent Grading Assistance.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Gain unmatched accuracy and reclaim valuable time. Our AI assistant handles the routine grading against your gold standard, letting you focus on mentoring and curriculum.
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

            <div className="relative lg:h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 border bg-muted/50 flex items-center justify-center group">
               <img
                 src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop"
                 alt="Diverse students collaborating in a modern workspace"
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

               <div className="absolute bottom-8 left-8 right-8 text-white text-left z-10">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">AI</div>
                          <div>
                              <div className="font-semibold text-sm">Grading Complete</div>
                              <div className="text-xs text-white/70">Just now • Accuracy 99.8%</div>
                          </div>
                      </div>
                      <p className="text-sm font-light">"Consistent, fair, and incredibly fast. The vault provides total transparency."</p>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section id="how-it-works" className="py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Precision at Scale</h2>
              <p className="text-muted-foreground text-lg">
                A streamlined workflow designed for high-volume academic environments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="bg-card border rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-6 text-blue-600">
                        <Upload className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">1. Define Standards</h3>
                    <p className="text-muted-foreground">Upload your exact marking scheme. The system adheres strictly to your criteria, ensuring fairness across hundreds of scripts.</p>
                </div>
                <div className="bg-card border rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="mx-auto h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center mb-6 text-violet-600">
                        <Zap className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">2. Frictionless Input</h3>
                    <p className="text-muted-foreground">Students submit work via a simple code. No complex enrollments, just instant, secure digital hand-in.</p>
                </div>
                <div className="bg-card border rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">3. Instant Feedback</h3>
                    <p className="text-muted-foreground">Detailed, constructive feedback is generated alongside the score, providing students with actionable insights immediately.</p>
                </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24">
             <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 relative h-[600px] rounded-2xl overflow-hidden shadow-2xl border">
                        <img
                            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop"
                            alt="Data analytics on a screen in a modern office"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                         <div className="absolute inset-0 bg-black/20"></div>
                    </div>

                    <div className="order-1 lg:order-2 space-y-8">
                        <h2 className="text-3xl font-bold tracking-tight">Built for the Modern Campus</h2>
                        <div className="grid grid-cols-1 gap-6">
                          {[
                            {
                              icon: BrainCircuit,
                              title: "DeepSeek AI Engine",
                              desc: "Powered by advanced LLMs to understand nuance, handwriting, and complex reasoning in student answers."
                            },
                            {
                              icon: FileText,
                              title: "Transparent Vault",
                              desc: "Students can access their graded work instantly. A clear, auditable trail for every mark awarded."
                            },
                            {
                              icon: ShieldCheck,
                              title: "Academic Integrity",
                              desc: "Built-in plagiarism detection and pattern recognition to ensure the validity of every assessment."
                            },
                            {
                              icon: BarChart2,
                              title: "Continuous Assessment",
                              desc: "Real-time analytics aggregating student performance across all work sessions in a semester."
                            },
                            {
                              icon: Code,
                              title: "Zero-Friction Access",
                              desc: "No barriers to entry. Students connect via Work Codes, eliminating administrative overhead."
                            },
                            {
                              icon: Download,
                              title: "Administrative Export",
                              desc: "One-click generation of master gradebooks and annotated script archives for departmental filing."
                            }
                          ].map((feature, idx) => (
                            <div key={idx} className="flex gap-4 items-start p-4 hover:bg-secondary/50 rounded-xl transition-colors">
                              <div className="mt-1 bg-primary/10 p-2 rounded-lg shrink-0">
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
                </div>
             </div>
        </section>

        {/* Outcomes Section */}
        <section id="outcomes" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
             <h2 className="text-3xl font-bold tracking-tight mb-8">Measurable Outcomes</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 bg-background rounded-xl border shadow-sm">
                   <div className="text-4xl font-extrabold text-blue-600 mb-2">90%</div>
                   <p className="text-muted-foreground">Reduction in grading time</p>
                </div>
                <div className="p-6 bg-background rounded-xl border shadow-sm">
                   <div className="text-4xl font-extrabold text-violet-600 mb-2">24/7</div>
                   <p className="text-muted-foreground">Instant feedback availability</p>
                </div>
                <div className="p-6 bg-background rounded-xl border shadow-sm">
                   <div className="text-4xl font-extrabold text-green-600 mb-2">100%</div>
                   <p className="text-muted-foreground">Audit trail transparency</p>
                </div>
             </div>
          </div>
        </section>

        {/* Partnerships Section */}
        <section id="partnerships" className="py-24">
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-12">Trusted By Leading Institutions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
               {/* Placeholders as per memory */}
               <div className="flex items-center justify-center p-4 border rounded-lg">
                  <span className="font-bold text-xl">School of Engineering</span>
               </div>
               <div className="flex items-center justify-center p-4 border rounded-lg">
                  <span className="font-bold text-xl">College of Business</span>
               </div>
               <div className="flex items-center justify-center p-4 border rounded-lg">
                   <span className="font-bold text-xl">Institute of Technology</span>
               </div>
               <div className="flex items-center justify-center p-4 border rounded-lg">
                   <span className="font-bold text-xl">Faculty of Sciences</span>
               </div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section id="faqs" className="py-24 bg-secondary/20">
           <div className="max-w-3xl mx-auto px-6 md:px-12">
              <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Frequently Asked Questions</h2>
              <div className="space-y-6">
                 <div className="bg-background p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Is the grading really automated?</h3>
                    <p className="text-muted-foreground">Yes, our AI engine analyzes student submissions against your specific rubric to generate grades and feedback, which you can then review and approve.</p>
                 </div>
                 <div className="bg-background p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg mb-2">How secure is student data?</h3>
                    <p className="text-muted-foreground">We adhere to strict data protection standards. All data is encrypted in transit and at rest, and we provide a full audit trail for every action.</p>
                 </div>
                 <div className="bg-background p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Can I customize the grading strictness?</h3>
                    <p className="text-muted-foreground">Absolutely. You can configure the AI to be Lenient, Moderate, or Strict depending on the nature of the assessment.</p>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
