"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function StudentPortal() {
  const router = useRouter();
  const [workCode, setWorkCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workCode) return;
    setLoading(true);
    router.push(`/student/${workCode}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Student Portal
          </h1>
          <p className="text-slate-500">
            Enter the Work Code provided by your lecturer to submit your assessment.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            placeholder="e.g. CS101-MIDTERM"
            value={workCode}
            onChange={(e) => setWorkCode(e.target.value)}
            className="text-center text-lg h-12 uppercase"
            maxLength={10}
            required
          />
          <Button type="submit" className="w-full h-12" disabled={loading || !workCode}>
            {loading ? "Verifying..." : "Access Work Session"}
          </Button>
        </form>
      </div>
    </div>
  );
}
