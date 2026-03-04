"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function WorkSessionPage() {
  const params = useParams();
  const workCode = params.workCode as string;
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    setStatus("uploading");

    try {
      // 1. Upload to Supabase Bucket directly
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `submissions/${workCode}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("playbook_files") // Ensure this bucket exists and is public
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("playbook_files")
        .getPublicUrl(filePath);

      // 2. Notify backend to trigger queue job
      const res = await fetch("/api/submissions/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workCode,
          pdfUrl: urlData.publicUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to register submission");

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Submission Received</h2>
          <p className="text-slate-500">
            Your assessment has been uploaded and is currently being processed by the AI grading engine.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-lg w-full p-8 bg-white rounded-xl shadow-sm border space-y-8 text-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Submit Assessment: {workCode}
          </h2>
          <p className="text-slate-500 text-sm">
            Upload your completed exam as a strictly formatted PDF file. Max 10MB.
          </p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
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
                aria-hidden="true"
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
                  Click to select a PDF
                </span>
              )}
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-12"
            disabled={!file || loading}
          >
            {loading ? "Uploading..." : "Submit PDF"}
          </Button>
          {status === "error" && (
            <p className="text-sm text-red-500 mt-2">
              Failed to upload. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
