"use client";

import React, { useState } from "react";
import { 
    getClientGeminiKey, 
    convertPdfToImagesClient, 
    fileToBase64, 
    extractStudentExamsClient, 
    normalizeQuestionId 
} from "@/lib/ai/client-engine";

// REKEBISHO: Tumetumia path sahihi ya @/lib/supabase-client kama inavyoonekana kwenye GitHub yako
import { uploadToSupabaseClient } from "@/lib/supabase-client";

interface SubmissionDrawerProps {
    workSessionId: string;
}

/**
 * L9 Submission Engine - Student Side
 * Inashughulikia: Multi-modal extraction, file upload, na server-side grading trigger.
 */
export function SubmissionDrawer({ workSessionId }: SubmissionDrawerProps) {
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
            // 1. Convert Student File (PDF/Image) to Base64 Images kwa ajili ya Vision API
            let base64Images: string[] = [];
            if (selectedFile.type === 'application/pdf') {
                base64Images = await convertPdfToImagesClient(selectedFile);
            } else {
                base64Images.push(await fileToBase64(selectedFile));
            }

            // 2. Fetch IDs za maswali kutoka kwenye Rubric (Marking Scheme)
            const rubricItemsRes = await fetch(`/api/work-sessions/${workSessionId}`);
            if (!rubricItemsRes.ok) throw new Error("Mawasiliano na server yamefeli");
            const rubricData = await rubricItemsRes.json();
            
            const rawTargetQuestions = (rubricData.rubricData || JSON.parse(rubricData.rubricText || "[]")).map((i: any) => i.qId || i.questionId);
            
            // Hakikisha IDs zote ziko normalized (mfano: "1a" badala ya "1(a)")
            const targetQuestions = rawTargetQuestions.map((id: string) => normalizeQuestionId(id));

            // 3. Client-Side AI Semantic Extraction (Vision Task)
            const apiKey = await getClientGeminiKey();
            const extractedMap = await extractStudentExamsClient(base64Images, targetQuestions, apiKey);

            setLoadingState("uploading");
            
            // 4. Upload faili halisi kwenda Supabase Storage kwa kutumia helper yako sahihi
            const filePath = await uploadToSupabaseClient(
                selectedFile, 
                "exam_pdfs", 
                `submissions/${Date.now()}_${selectedFile.name}`
            );

            // 5. Tuma JSON Map iliyofanyiwa extraction kwenda kwenye API ya Grading
            const res = await fetch("/api/student/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workSessionId,
                    extractedText: JSON.stringify([extractedMap]), 
                    filePath
                }),
            });

            if (!res.ok) throw new Error("Imeshindikana kusave submission");
            setLoadingState("success");
            
        } catch (err) { 
            console.error("Critical Failure katika Submission Engine:", err);
            setLoadingState("error");
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100 max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Wasilisha Kazi Yako</h2>
            <p className="text-gray-500 text-sm mb-6">Pakia picha au PDF ya mtihani wako kwa ajili ya usahihishaji wa haraka.</p>
            
            <div className="space-y-4">
                <div className="relative border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <input 
                        type="file" 
                        accept="application/pdf,image/*" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center">
                        <span className="text-blue-600 font-medium">
                            {selectedFile ? selectedFile.name : "Chagua faili hapa"}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">PDF, PNG au JPG (Max 10MB)</p>
                    </div>
                </div>

                <button 
                    onClick={handleUploadClick} 
                    disabled={!selectedFile || loadingState === "extracting" || loadingState === "uploading"}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                >
                    {loadingState === "idle" && "Anza Usahihishaji"}
                    {loadingState === "extracting" && "AI Inachambua Karatasi..."}
                    {loadingState === "uploading" && "Inatuma Kazi Server..."}
                    {loadingState === "success" && "Kazi Imepokelewa!"}
                    {loadingState === "error" && "Jaribu Tena Kidogo"}
                </button>

                {loadingState === "success" && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center animate-pulse">
                        Tayari! Matokeo yako yanatengenezwa.
                    </div>
                )}
            </div>
        </div>
    );
}
