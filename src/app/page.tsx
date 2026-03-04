import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 justify-center items-center">
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Intelligence Applied to Grading
        </h1>
        <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Playbook is the ultimate AI-powered grading engine for top-tier universities.
          Deterministic, fast, and completely transparent.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard">
             <Button size="lg" className="rounded-full bg-slate-900 text-slate-50 hover:bg-slate-800 px-8">
               Lecturer Login
             </Button>
          </Link>
          <Link href="/student">
             <Button size="lg" variant="outline" className="rounded-full px-8">
               Student Access
             </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
