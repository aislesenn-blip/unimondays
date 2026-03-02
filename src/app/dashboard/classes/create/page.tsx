"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CreateClassPage() {
  const [className, setClassName] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) {
      toast.error("Please enter a class name");
      return;
    }

    // Mock code generation
    const code = className.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000) + "-FALL";
    setGeneratedCode(code);
    toast.success("Class created successfully");
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success("Code copied to clipboard");
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl mt-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4 -ml-4 text-slate-500 hover:text-slate-900">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Create New Class</h1>
          <p className="text-slate-500 mt-1">Set up a new space for your students to join and submit work.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-slate-200 shadow-sm">
            {!generatedCode ? (
              <form onSubmit={handleCreate}>
                <CardHeader>
                  <CardTitle className="text-xl">Class Details</CardTitle>
                  <CardDescription>Enter the basic information for your new class.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Class Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Computer Science 101"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="max-w-md focus-visible:ring-slate-400"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t border-slate-100 rounded-b-xl px-6 py-4 flex justify-end">
                  <Button type="submit" className="min-w-[120px]">Create Class</Button>
                </CardFooter>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900 mb-2">Class Created!</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Your class is ready. Share this code with your students so they can join.
                  </p>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-lg p-6 max-w-md mx-auto relative group flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Access Code</p>
                    <p className="text-3xl font-mono font-bold text-slate-900 tracking-widest">{generatedCode}</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} className="h-10 w-10 shrink-0 border-slate-300">
                    <Copy className="h-4 w-4 text-slate-600" />
                  </Button>
                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-4 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">Return Home</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/dashboard/classes/new-id`}>Go to Class</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}