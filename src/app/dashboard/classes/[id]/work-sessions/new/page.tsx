"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function NewWorkSessionPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF rubric.");
      return;
    }
    setLoading(true);

    try {
      // 1. Upload Rubric PDF to Supabase directly
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `rubrics/${classId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("playbook_files")
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("playbook_files")
        .getPublicUrl(filePath);

      // 2. Call backend to standardize and create session
      const res = await fetch("/api/work-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          title,
          rubricUrl: urlData.publicUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to create work session");

      router.push(`/dashboard/classes/${classId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("An error occurred creating the session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Work Session</h2>
        <p className="text-slate-500">
          Upload your PDF marking scheme (rubric). The AI will standardize it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Session Title</Label>
          <Input
            id="title"
            placeholder="e.g. Midterm Examination"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Marking Scheme (PDF)</Label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 hover:bg-slate-50 transition-colors">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              id="file-upload"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <svg
                className="mx-auto h-12 w-12 text-slate-400 mb-4"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {file ? (
                <span className="font-medium text-slate-900">{file.name}</span>
              ) : (
                <span className="font-medium text-blue-600">
                  Select a PDF Rubric
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || !file}>
            {loading ? "Standardizing Rubric..." : "Create Work Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
