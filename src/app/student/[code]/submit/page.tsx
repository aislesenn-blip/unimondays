"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle2, ArrowRight } from "lucide-react";

export default function StudentSubmitPage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file) return;

    setIsSubmitting(true);

    // Simulate upload delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 2000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900 p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center px-4 py-1.5 bg-slate-200/50 text-slate-600 rounded-full text-sm font-medium tracking-wide mb-4">
            Class Code: {code}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Submit Assignment
          </h1>
          <p className="text-slate-500 mt-3 text-lg font-light">
            Upload your completed work as a PDF for AI evaluation.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200/60"
            >
              <div
                className={`relative border-2 border-dashed rounded-[1.5rem] p-12 transition-all duration-300 flex flex-col items-center justify-center text-center ${
                  isDragging
                    ? "border-slate-400 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {!file ? (
                  <>
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                      <UploadCloud className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Drag & drop your PDF</h3>
                    <p className="text-slate-500 text-sm">or click to browse from your device</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                      <FileText className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1 max-w-[200px] truncate">
                      {file.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!file || isSubmitting}
                  className={`flex items-center justify-center py-4 px-8 rounded-2xl font-medium transition-all group ${
                    !file || isSubmitting
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      Submit Work
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-200/60 text-center flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Successfully Submitted</h2>
              <p className="text-slate-500 mb-8 max-w-sm">
                Your file <strong>{file?.name}</strong> has been uploaded and queued for AI evaluation.
              </p>

              <div className="w-full max-w-md bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/50">
                  <span className="text-slate-500 text-sm">Submission ID</span>
                  <span className="font-mono text-sm text-slate-800">#SUB-{Math.floor(Math.random() * 10000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Timestamp</span>
                  <span className="text-sm text-slate-800">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/student/${code}/results`)}
                className="w-full max-w-md flex items-center justify-center py-4 px-6 bg-slate-900 text-white rounded-2xl font-medium hover:bg-slate-800 transition-all group shadow-sm hover:shadow-md"
              >
                View AI Results
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
