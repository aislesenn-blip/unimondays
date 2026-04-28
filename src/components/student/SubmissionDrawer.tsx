"use client";

import React, { useState } from "react";
import {
    getClientGeminiKey,
    convertPdfToImagesClient,
    fileToBase64,
    extractStudentExamsClient,
    normalizeQuestionId
} from "@/lib/ai/client-engine";
import { supabaseClient } from "@/lib/supabase-client";

interface SubmissionDrawerProps {
    session: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function SubmissionDrawer({ session, open, onOpenChange, onSuccess }: SubmissionDrawerProps) {
    if (!open || !session) return null;
    const workSessionId = session.id;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loadingState, setLoadingState] = useState<"idle" | "extracting" | "uploading" | "success" | "error">("idle");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadClick = async () => {
        if (!selectedFile) return;
        setLoadingState("extracting");

        try {
            let base64Images: string[] = [];
            if (selectedFile.type === 'application/pdf') {
                base64Images = await convertPdfToImagesClient(selectedFile);
            } else {
                base64Images.push(await fileToBase64(selectedFile));
            }

            // TUMIA NJIA MPYA SALAMA INAYOZUIA 403 FORBIDDEN
            console.log("Stage 2: Fetching Safe Question IDs...");
            const questionsRes = await fetch(`/api/student/get-questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workSessionId })
            });

            if (!questionsRes.ok) throw new Error("Imeshindwa kuvuta orodha ya maswali. Seva imegoma.");

            const { questionIds } = await questionsRes.json();

            // Normalize IDs tayari kwa AI Extraction
            const targetQuestions = questionIds.map((id: string) => normalizeQuestionId(id));

            const apiKey = await getClientGeminiKey();
            const extractedMap = await extractStudentExamsClient(base64Images, targetQuestions, apiKey);

            setLoadingState("uploading");

            // TUMETUMIA SUPABASE CLIENT MOJA KWA MOJA KUZUIA ERROR
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `submissions/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("exam_pdfs")
                .upload(filePath, selectedFile);

            if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

            // HAPA NDIPO TUMEWEKA ENDPOINT SAHIHI YA "SUBMIT"
            const res = await fetch("/api/student/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workSessionId,
                    extractedText: JSON.stringify([extractedMap]),
                    filePath
                }),
            });

            if (!res.ok) throw new Error("Backend upload failed");
            setLoadingState("success");
            onSuccess();
            setTimeout(() => onOpenChange(false), 2000);

        } catch (err) {
            console.error("Submission processing failed:", err);
            setLoadingState("error");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto w-full relative">
            <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
                ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Submit Your Exam</h2>
            <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
                onClick={handleUploadClick}
                disabled={!selectedFile || loadingState === "extracting" || loadingState === "uploading"}
                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-400"
            >
                {loadingState === "idle" && "Upload and Grade"}
                {loadingState === "extracting" && "Analyzing Document..."}
                {loadingState === "uploading" && "Submitting..."}
                {loadingState === "success" && "Submission Complete!"}
                {loadingState === "error" && "Upload Failed. Try Again."}
            </button>
          </div>
        </div>
    );
}
