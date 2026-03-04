"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DirectUploadProps {
  studentId: string;
  workSessionId: string;
}

export function DirectUpload({ studentId, workSessionId }: DirectUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"IDLE" | "UPLOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // STRICTLY PDF ONLY for deterministic OCR
      if (selectedFile.type !== "application/pdf") {
        setErrorMessage("Please select a PDF file. Images and other formats are not supported.");
        setStatus("ERROR");
        return;
      }
      setFile(selectedFile);
      setStatus("IDLE");
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("UPLOADING");

    try {
      const filePath = `${studentId}/${workSessionId}/${file.name}`;

      // CRITICAL: Upload directly to Supabase Storage from Client
      // Bypassing Next.js API Routes entirely
      const { data, error } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      // Trigger our robust backend Background Job Queue using the submission API route
      // Returning success instantly to frontend while heavy OCR/AI jobs queue
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          workSessionId,
          fileUrl: publicUrl
        })
      });

      if (!res.ok) {
        throw new Error("Failed to queue submission processing.");
      }

      setStatus("SUCCESS");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during upload.");
      setStatus("ERROR");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 md:p-8 border border-slate-200 bg-white rounded-2xl shadow-sm">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-medium text-slate-900">Upload Exam Script</h2>
        <p className="text-sm font-light text-slate-500">Strictly PDF format only for deterministic text extraction.</p>
      </div>

      <div className="space-y-6">
        <div className="relative group cursor-pointer">
           <input
             type="file"
             accept="application/pdf"
             onChange={handleFileChange}
             disabled={status === "UPLOADING" || status === "SUCCESS"}
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
           />
           <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
              <Upload className="h-8 w-8 text-slate-400 mb-3" strokeWidth={1.5} />
              {file ? (
                <div className="text-center">
                   <p className="font-medium text-slate-900 text-sm truncate max-w-[200px]">{file.name}</p>
                   <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                   <p className="font-medium text-slate-900 text-sm">Drag and drop your PDF</p>
                   <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                </div>
              )}
           </div>
        </div>

        {status === "ERROR" && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || status === "UPLOADING" || status === "SUCCESS"}
          className="w-full h-12 flex items-center justify-center rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-colors"
        >
          {status === "IDLE" && "Submit Document"}
          {status === "UPLOADING" && (
            <span className="flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" /> Processing...
            </span>
          )}
          {status === "SUCCESS" && (
            <span className="flex items-center text-emerald-400">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Queued Successfully
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
