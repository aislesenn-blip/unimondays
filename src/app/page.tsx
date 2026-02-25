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
                Enterprise Grade Assessment Infrastructure
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Scale Your University's <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Grading Capacity.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Empower your Lecturers, HODs, and Deans with automated qualitative reports, significant workload reduction, and secure, AI-assisted grading pipelines.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base rounded-full")}>
                  Partner with Us <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/student/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 text-base rounded-full")}>
                  Login to Portal
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
              <h2 className="text-3xl font-bold tracking-tight">Executive Outcomes for Faculty</h2>
              <p className="text-muted-foreground text-lg">
                Designed to meet the rigorous demands of modern higher education administration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: FileText,
                  title: "Executive Summaries",
                  desc: "Generate automated qualitative reports for HODs and Deans to monitor academic performance across departments."
                },
                {
                  icon: BrainCircuit,
                  title: "90% Workload Reduction",
                  desc: "AI-assisted grading reduces time spent on routine marking, allowing lecturers to focus on high-impact teaching."
                },
                {
                  icon: ShieldCheck,
                  title: "Audit & Compliance",
                  desc: "Full audit trails for every grade and change, ensuring strict adherence to university standards."
                },
                {
                  icon: BarChart2,
                  title: "Department Analytics",
                  desc: "Real-time visibility into course performance, identifying at-risk students and curriculum gaps."
                },
                {
                  icon: Code,
                  title: "Secure Distribution",
                  desc: "Encrypted, code-based assessment delivery ensures integrity during both physical and digital exams."
                },
                {
                  icon: Download,
                  title: "Institutional Export",
                  desc: "One-click generation of Excel gradebooks and formal PDF report cards compatible with legacy LMS."
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

        {/* Partnerships Section */}
        <section id="partnerships" className="py-24">
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Trusted by Forward-Thinking Institutions</h2>
            <div className="flex flex-wrap justify-center gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
               {/* Placeholders for logos */}
               <div className="text-2xl font-bold text-muted-foreground">College of Engineering</div>
               <div className="text-2xl font-bold text-muted-foreground">Institute of Technology</div>
               <div className="text-2xl font-bold text-muted-foreground">School of Business</div>
               <div className="text-2xl font-bold text-muted-foreground">Faculty of Law</div>
               <div className="text-2xl font-bold text-muted-foreground">Medical Sciences</div>
               <div className="text-2xl font-bold text-muted-foreground">Department of Computer Science</div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section id="faqs" className="py-24 bg-secondary/30">
          <div className="max-w-3xl mx-auto px-6 md:px-12">
            <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">Administrative FAQs</h2>
            <div className="space-y-6">
              {[
                { q: "How does this integrate with our existing workflows?", a: "Playbook acts as a specialized layer for assessment. We export data in standard formats (CSV, PDF) compatible with all major LMS platforms." },
                { q: "Is the AI grading compliant with academic standards?", a: "Yes. The AI serves as a 'First Marker'. The Lecturer maintains full control and override authority, acting as the 'External Examiner' to validate all grades." },
                { q: "Can Deans view cross-departmental data?", a: "Yes. Our role-based access control allows Deans and HODs to view aggregated reports and performance metrics across their jurisdiction." },
                { q: "How do you handle data privacy and sovereignty?", a: "We adhere to strict data residency and privacy laws. Student data is encrypted and isolated. We do not use your proprietary data to train public models." },
                { q: "What is the onboarding process for a Faculty?", a: "We offer a white-glove onboarding service, setting up your department, importing student lists, and training staff on the platform." }
              ].map((faq, i) => (
                <div key={i} className="bg-card p-6 rounded-xl border">
                  <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section id="privacy" className="py-24">
          <div className="max-w-4xl mx-auto px-6 md:px-12 text-center space-y-6">
             <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
             <h2 className="text-3xl font-bold tracking-tight">Enterprise Compliance</h2>
             <p className="text-lg text-muted-foreground">
               We are committed to protecting the integrity of your institution. Our platform is built on secure, audit-ready infrastructure.
             </p>
             <div className="flex justify-center gap-4 pt-4">
               <Link href="/privacy" className={cn(buttonVariants({ variant: "outline" }))}>Read Compliance Policy</Link>
               <Button variant="ghost">Request Security Audit</Button>
             </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
