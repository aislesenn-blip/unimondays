"use client";
import { createBrowserClient } from "@supabase/ssr";
import * as tus from "tus-js-client";

import { useState, useEffect } from "react";
import {
  CloudLightning,
  FileText,
  UploadCloud,
  Link as LinkIcon,
  CheckCircle2,
  Loader2,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { supabaseClient } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";

// Reusing existing components logic where applicable, or inline for specific new feature
import { Textarea } from "@/components/ui/textarea";

export default function CloudMarkingPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);


  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          if (field === "cloudLink") {
             handleTusUpload(e.dataTransfer.files[0]);
          } else {
             handleFileUpload({ target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>, field as "markingScheme" | "questionPaperUrl" | "cloudLink");
          }
      }
  };

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const handleTusUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setUploadProgress(0);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;

            const fileExt = file.name.split('.').pop();
            const fileName = `bulk_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const bucketName = 'exam_pdfs';

            const upload = new tus.Upload(file, {
                endpoint: uploadUrl,
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'x-upsert': 'true',
                },
                uploadDataDuringCreation: true,
                metadata: {
                    bucketName: bucketName,
                    objectName: fileName,
                    contentType: file.type,
                    cacheControl: '3600',
                },
                chunkSize: 6 * 1024 * 1024,
                onError: (error) => {
                    console.error("TUS Upload failed:", error);
                    toast.error("Upload failed: " + (error as Error).message);
                    setUploading(false);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal) * 100;
                    setUploadProgress(percentage);
                },
                onSuccess: () => {
                    setCloudLink(fileName);
                    toast.success("File uploaded successfully");
                    setUploading(false);
                },
            });

            upload.findPreviousUploads().then(function (previousUploads) {
                if (previousUploads.length) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                } else {
                    upload.start();
                }
            });
        } catch (error: unknown) {
            console.error("Upload error:", error);
            toast.error((error as Error).message || "Failed to upload file");
            setUploading(false);
        }
  };

  const router = useRouter();
  const [cloudLink, setCloudLink] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [markingSchemeUrl, setMarkingSchemeUrl] = useState("");
  const [questionPaperUrl, setQuestionPaperUrl] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Check for active session
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const res = await fetch("/api/cloud-marking/active");
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            toast.info("Resuming active session...");
            router.push(`/dashboard/cloud-marking/${data.id}`);
          }
        }
      } catch (e) {
        console.error("Failed to check active session", e);
      }
    };
    checkActiveSession();
  }, [router]);


  // Calibration State
  const [strictness, setStrictness] = useState("MODERATE");
  const [calibration] = useState({
    methodology: "Standard",
    grammar: "Ignore unless critical",
    verbosity: "Concise",
    incomplete: "Grade present work",
    custom: ""
  }); // Locked to standard defaults

  // Load from Draft
  useEffect(() => {
    const savedDraft = localStorage.getItem("cloudMarkingDraft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.sessionTitle) setSessionTitle(draft.sessionTitle);
        if (draft.totalMarks) setTotalMarks(draft.totalMarks);
        if (draft.strictness) setStrictness(draft.strictness);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Save to Draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("cloudMarkingDraft", JSON.stringify({
        sessionTitle,
        totalMarks,
        strictness
      }));
    }, 500); // Debounce save
    return () => clearTimeout(timeoutId);
  }, [sessionTitle, totalMarks, strictness]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "markingScheme" | "questionPaperUrl" | "cloudLink") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Direct Client-Side Upload
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `bulk_uploads/schemes/${filename}`;

      const { data, error } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(filePath, file);

      if (error) throw new Error((error as Error).message);

      if (fieldName === "markingScheme") {
        setMarkingSchemeUrl(data.path);
        toast.success("Marking scheme uploaded");
      } else if (fieldName === "questionPaperUrl") {
        setQuestionPaperUrl(data.path);
        toast.success("Question Paper uploaded");
      } else if (fieldName === "cloudLink") {
        setCloudLink(data.path);
        toast.success("Bulk exams uploaded successfully");
      }
    } catch (error: unknown) {
      toast.error(`Failed to upload ${fieldName}: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleStartCloudMarking = async () => {
    if (!cloudLink || !sessionTitle) {
      toast.error("Please provide a Session Title and upload the Bulk Exams PDF");
      return;
    }

    setLoading(true);
    try {
      // Prioritize URL if uploaded, else text
      const finalMarkingScheme = markingSchemeUrl || markingScheme;

      // 1. Run Standardization First
      const stdRes = await fetch("/api/rubrics/standardize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalMarkingScheme })
      });
      const stdData = await stdRes.json();
      if (!stdRes.ok) throw new Error(stdData.error || "Failed to standardize marking scheme");

      // Store the standardized rubric in session storage to pass to the next page
      sessionStorage.setItem("pendingStandardizedRubric", JSON.stringify(stdData));

      // Store session details so the final approval page can actually create the session
      sessionStorage.setItem("pendingBulkSessionPayload", JSON.stringify({
          title: sessionTitle,
          cloudLink,
          totalMarks,
          markingScheme: finalMarkingScheme, // Keep original
          questionPaperUrl,
          strictness,
          calibration
      }));

      toast.success("Marking Scheme extracted!");
      localStorage.removeItem("cloudMarkingDraft");

      // 2. Redirect to Review & Approve Screen
      router.push(`/dashboard/rubrics/standardize`);

    } catch (error: unknown) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b pb-6">
        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <CloudLightning className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Marking</h1>
          <p className="text-muted-foreground">
            Bulk processing for large-scale exam grading.
          </p>
        </div>
      </div>

      {/* MANDATE 2: TUTORIAL */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <CheckCircle2 className="h-5 w-5" /> How Cloud Marking Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 text-center group cursor-default">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center text-blue-600 font-bold border border-blue-100">1</div>
              <h3 className="font-semibold text-sm">Scan</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan all student exams into a single large merged PDF using your department scanner.
              </p>
            </div>
            <div className="space-y-2 text-center group cursor-default">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center text-blue-600 font-bold border border-blue-100">2</div>
              <h3 className="font-semibold text-sm">Upload</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload the merged PDF file directly below. Large files up to 2GB are supported.
              </p>
            </div>
            <div className="space-y-2 text-center group cursor-default">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center text-blue-600 font-bold border border-blue-100">3</div>
              <h3 className="font-semibold text-sm">Process</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The AI will securely process the file, slice, grade, and organize submissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-3 relative items-start">
        {/* MANDATE 3: CONFIGURATION (Left Col) */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings2 className="h-5 w-5" /> Session Configuration
                    </CardTitle>
                    <CardDescription>Setup grading parameters before processing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label>Session Title</Label>
                            <Input
                                placeholder="e.g. CS101 Midterm 2024 (Bulk)"
                                value={sessionTitle}
                                onChange={(e) => setSessionTitle(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Total Marks</Label>
                                <Input
                                    type="number"
                                    value={totalMarks}
                                    onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Strictness</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={strictness}
                                    onChange={(e) => setStrictness(e.target.value)}
                                >
                                    <option value="LENIENT">Lenient (0.8x)</option>
                                    <option value="MODERATE">Moderate (1.0x)</option>
                                    <option value="STRICT">Strict (1.2x)</option>
                                </select>
                             </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">Blank Question Paper <span className="text-xs text-muted-foreground ml-1 font-normal">(Optional but highly recommended for 100% grading accuracy & question tracking)</span></Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, "questionPaperUrl")}
                                    accept=".pdf,.jpg,.png"
                                    disabled={uploading}
                                    className="cursor-pointer"
                                />
                                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            {questionPaperUrl && (
                                <div className="text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 p-2 rounded border border-green-200 mt-2">
                                    <FileText className="w-3 h-3"/> Question Paper Uploaded
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Marking Scheme / Gold Standard <span className="text-destructive">*</span></Label>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="file"
                                        onChange={(e) => handleFileUpload(e, "markingScheme")}
                                        accept=".pdf,.jpg,.png"
                                        disabled={uploading}
                                        className="cursor-pointer"
                                    />
                                    {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                                {markingSchemeUrl && (
                                    <div className="text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 p-2 rounded border border-green-200">
                                        <FileText className="w-3 h-3"/> Marking Scheme Uploaded
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground text-center uppercase tracking-wider font-bold">OR</div>
                                <Textarea
                                    placeholder="Paste your marking scheme text here, or describe the gold standard answer..."
                                    className="min-h-[100px]"
                                    value={markingScheme}
                                    onChange={(e) => setMarkingScheme(e.target.value)}
                                    disabled={!!markingSchemeUrl}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Upload a PDF/Image of the marking scheme, or paste the text directly.
                            </p>
                        </div>

                        {/* Deterministic AI Transparency (The Wow Factor) */}
                        <div className="space-y-4 border p-5 rounded-md bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <h3 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                                    v3.0 Deterministic Engine Active
                                </h3>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Bulk submissions are powered by our locked, institutional-grade grading engine. No prompt engineering required. The engine strictly enforces a 3-Tier Semantic Logic:
                            </p>
                            <ul className="space-y-2 mt-2">
                                <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white mt-0.5">1.</span>
                                    <span><strong className="text-emerald-600 dark:text-emerald-400">Direct Match:</strong> Exact semantic alignment with your rubric.</span>
                                </li>
                                <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white mt-0.5">2.</span>
                                    <span><strong className="text-amber-600 dark:text-amber-400">Equivalent Concept:</strong> Scientifically correct alternative phrasing (Flagged for your review).</span>
                                </li>
                                <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white mt-0.5">3.</span>
                                    <span><strong className="text-rose-600 dark:text-rose-400">Out of Scope:</strong> Factually true but irrelevant to the question (Zero Marks).</span>
                                </li>
                            </ul>
                            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                The Marking Scheme is the Absolute Authority.
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>

        {/* MANDATE 2: INPUT (Right Col) */}
        <div className="space-y-6 sticky top-6">
            <Card className="border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-primary" /> Start Processing
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                                                                         <div className="space-y-2">
                            <Label>Bulk Exams PDF (Max 2GB)</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[160px] ${cloudLink ? 'bg-green-50/50 border-green-200' : 'hover:bg-slate-50 border-slate-300'}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, "cloudLink")}
                            >
                                {cloudLink ? (
                                    <div className="flex flex-col items-center text-green-600">
                                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <p className="font-medium">File Uploaded successfully</p>
                                        <p className="text-xs mt-1 text-green-600/70">{cloudLink}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                            <UploadCloud className="h-6 w-6 text-slate-500" />
                                        </div>
                                        <p className="text-sm font-medium">Drag & drop your merged PDF here</p>
                                        <p className="text-xs text-muted-foreground mt-1 mb-4">or click to browse files</p>
                                        <Input
                                            type="file"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleTusUpload(e.target.files[0]);
                                                }
                                            }}
                                            accept=".pdf"
                                            disabled={uploading}
                                            className="hidden"
                                            id="tus-file-upload"
                                        />
                                        <Label
                                            htmlFor="tus-file-upload"
                                            className={`cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {uploading ? 'Uploading...' : 'Select File'}
                                        </Label>
                                    </>
                                )}
                            </div>

                            {uploading && (
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Uploading...</span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                         </div>\n\n                         <Separator />

                         <Button
                            className="w-full h-12 text-lg font-semibold shadow-xl shadow-primary/20"
                            onClick={handleStartCloudMarking}
                            disabled={loading || uploading}
                         >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Extracting & Standardizing...
                                </>
                            ) : (
                                <>
                                    <CloudLightning className="mr-2 h-5 w-5" />
                                    Start Cloud Marking
                                </>
                            )}
                         </Button>

                         <p className="text-xs text-center text-muted-foreground">
                            This process runs in the background. You can leave the page once started.
                         </p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
