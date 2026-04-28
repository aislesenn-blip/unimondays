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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
            toast.success("Uploaded! Grading is happening in the background.");
            onSuccess();
            setTimeout(() => onOpenChange(false), 2000);

        } catch (err: any) {
            console.error("Submission processing failed:", err);
            toast.error(err.message || "An unexpected error occurred during file transfer");
            setLoadingState("error");
        }
    };

    return (
        <Sheet open={open} onOpenChange={(val) => {
            if (!val && (loadingState === 'extracting' || loadingState === 'uploading')) {
                // Prevent closing while processing
                return;
            }
            onOpenChange(val);
            if (!val) {
                // Reset state when drawer closes
                setTimeout(() => {
                    setSelectedFile(null);
                    setLoadingState("idle");
                }, 300);
            }
        }}>
            <SheetContent side="bottom" className="h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto">
                <div className="mx-auto w-full max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Upload your work</SheetTitle>
                        <SheetDescription>
                            {session.title}
                            {session.deadline && (
                                <><br />Due {new Date(session.deadline).toLocaleString()}</>
                            )}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        {/* Interactive Dropzone UI */}
                        <div className="relative border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                            <input
                                type="file"
                                accept="application/pdf,image/png,image/jpeg,image/jpg"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0];
                                    if (selected) {
                                        if (selected.size > 20 * 1024 * 1024) {
                                            toast.error("File is too large. Please upload a file smaller than 20MB.");
                                            e.target.value = "";
                                            setSelectedFile(null);
                                            return;
                                        }
                                        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                                        if (!allowedTypes.includes(selected.type)) {
                                            toast.error("Invalid file type. Only PDF, PNG, and JPG are allowed.");
                                            e.target.value = "";
                                            setSelectedFile(null);
                                            return;
                                        }
                                        setSelectedFile(selected);
                                    } else {
                                        setSelectedFile(null);
                                    }
                                }}
                            />
                            <div className="flex flex-col items-center gap-3 pointer-events-none">
                                {selectedFile ? (
                                    <>
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{selectedFile.name}</div>
                                            <div className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">Click to Upload</div>
                                            <div className="text-xs text-muted-foreground">PDF, PNG, JPG (Max 20MB)</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="sm:justify-between gap-4">
                        <SheetClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto" disabled={loadingState === "extracting" || loadingState === "uploading"}>Cancel</Button>
                        </SheetClose>
                        <Button
                            onClick={handleUploadClick}
                            disabled={!selectedFile || loadingState === "extracting" || loadingState === "uploading" || loadingState === "success"}
                            className="w-full sm:w-auto relative"
                        >
                            {(loadingState === "extracting" || loadingState === "uploading") ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    {loadingState === "extracting" ? "Analyzing Document..." : "Uploading..."}
                                </span>
                            ) : loadingState === "success" ? (
                                "Submission Complete!"
                            ) : loadingState === "error" ? (
                                "Upload Failed. Try Again."
                            ) : (
                                "Upload and Grade"
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}
