"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentAccessPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/student/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />

      <Link href="/" className="absolute top-8 left-8">
        <Button variant="ghost" className="text-slate-500 hover:text-slate-900 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back home
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-slate-200/60 shadow-xl rounded-3xl bg-white overflow-hidden">
          <div className="h-32 bg-emerald-50 relative flex items-center justify-center border-b border-emerald-100/50">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0,transparent_100%)]" />
             <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center z-10">
               <GraduationCap className="h-8 w-8 text-emerald-600" />
             </div>
          </div>
          <CardContent className="p-8 pt-10 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Join your class</h1>
            <p className="text-slate-500 mb-8 font-medium">Enter the access code provided by your teacher to view assignments and results.</p>

            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <Input
                  placeholder="e.g. MATH-401"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-14 text-center text-xl uppercase tracking-widest font-semibold rounded-2xl bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                  maxLength={12}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm hover:shadow-md transition-all group"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
