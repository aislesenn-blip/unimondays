"use client";

import { useState, useRef, DragEvent } from "react";
import {
  CloudLightning,
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Settings2,
  FileUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { supabaseClient } from "@/lib/supabase-client";
import { v4 as uuidv4 } from "uuid";
import { Textarea } from "@/components/ui/textarea";

export default function CloudMarkingPage() {
  const router = useRouter();
  const [sessionTitle, setSessionTitle] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [markingSchemeUrl, setMarkingSchemeUrl] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [loading, setLoading] = useState(false);
  const [uploadingScheme, setUploadingScheme] = useState(false);

  // Massive PDF Dropzone State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calibration State
  const [strictness, setStrictness] = useState("MODERATE");
  const [calibration, setCalibration] = useState({
    methodology: "partial_marks",
    grammar: "ignore_grammar",
    verbosity: "concise",
    incomplete: "grade_available",
    custom: ""
  });

  const handleSchemeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScheme(true);
    try {
      const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `rubrics/${filename}`;

      const { data, error } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(filePath, file);

      if (error) throw new Error(error.message);

      setMarkingSchemeUrl(data.path);
      toast.success("Marking scheme uploaded");
    } catch (error: any) {
      toast.error(`Failed to upload marking scheme: ${error.message}`);
    } finally {
      setUploadingScheme(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setBulkFile(droppedFile);
      } else {
        toast.error("Please drop a valid PDF file.");
      }
    }
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBulkFile(e.target.files[0]);
    }
  };

  const removeBulkFile = () => {
    setBulkFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartCloudMarking = async () => {
    if (!bulkFile) {
      toast.error("Please upload the bulk PDF file containing the scripts.");
      return;
    }
    if (!sessionTitle) {
      toast.error("Please provide a Session Title.");
      return;
    }
    if (!markingScheme && !markingSchemeUrl) {
      toast.error("Please provide a Marking Scheme (File or Text).");
      return;
    }

    setLoading(true);
    try {
      // 1. Direct Client-Side Upload for Massive PDF
      toast.loading("Uploading massive PDF to secure storage...", { id: "bulk-upload" });
      const bulkFilename = `bulk_${uuidv4()}.pdf`;
      const bulkFilePath = `bulk_uploads/${bulkFilename}`;

      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('exam_pdfs')
        .upload(bulkFilePath, bulkFile, {
            cacheControl: '3600',
            upsert: false
        });

      if (uploadError) throw new Error(uploadError.message);
      toast.success("Massive PDF uploaded successfully.", { id: "bulk-upload" });

      // 2. Initiate Background Session (API creates session, triggers worker)
      toast.loading("Initializing AI extraction session...", { id: "session-init" });
      const finalMarkingScheme = markingSchemeUrl || markingScheme;

      const res = await fetch("/api/cloud-marking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessionTitle,
          bulkFilePath: uploadData.path, // We pass the path to the backend worker
          totalMarks,
          markingScheme: finalMarkingScheme,
          strictness,
          calibration
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start session");

      toast.success("Cloud Session Initialized!", { id: "session-init" });
      router.push(`/dashboard/cloud-marking/${data.id}`);

    } catch (error: any) {
      toast.error(error.message, { id: "bulk-upload" });
      toast.dismiss("session-init");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl mx-auto pb-24">
      {/* Header - Apple/Uber Black Aesthetic */}
      <div className="flex flex-col gap-2 border-b border-border/50 pb-8">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
            <CloudLightning className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Cloud Marking</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Enterprise ingestion pipeline for massive, monolithic exam PDFs.
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-5">

        {/* Left Column: Configuration */}
        <div className="md:col-span-3 space-y-8">
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-widest">
                    <Settings2 className="h-4 w-4" /> Session Metadata
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Session Title</Label>
                        <Input
                            placeholder="e.g. CS101 Midterm 2024 (Bulk)"
                            className="h-12 text-base bg-transparent border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-none border-x-0 border-t-0 border-b-2"
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-4">
                            <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Total Marks</Label>
                            <Input
                                type="number"
                                className="h-10 bg-transparent border-border/50 rounded-md"
                                value={totalMarks}
                                onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                            />
                            </div>
                            <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Strictness</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-border/50 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                value={strictness}
                                onChange={(e) => setStrictness(e.target.value)}
                            >
                                <option value="LENIENT">Lenient (0.8x)</option>
                                <option value="MODERATE">Moderate (1.0x)</option>
                                <option value="STRICT">Strict (1.2x)</option>
                            </select>
                            </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-widest">
                    <FileText className="h-4 w-4" /> Gold Standard
                </div>

                <div className="space-y-4">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Marking Scheme Upload</Label>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Input
                                type="file"
                                onChange={handleSchemeUpload}
                                accept=".pdf,.json"
                                disabled={uploadingScheme}
                                className="cursor-pointer file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:hover:bg-primary/20 bg-transparent border-border/50"
                            />
                            {uploadingScheme && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                        {markingSchemeUrl && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                                <CheckCircle2 className="w-4 h-4"/> File Ready
                            </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-widest font-bold my-2">OR</div>
                        <Textarea
                            placeholder="Paste JSON Rubric or Text Marking Scheme..."
                            className="min-h-[120px] bg-transparent border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 resize-none rounded-md"
                            value={markingScheme}
                            onChange={(e) => setMarkingScheme(e.target.value)}
                            disabled={!!markingSchemeUrl}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Massive Dropzone & Action */}
        <div className="md:col-span-2 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-widest">
                <UploadCloud className="h-4 w-4" /> Payload
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-200 min-h-[250px] ${
                    isDragging ? 'border-primary bg-primary/5 scale-[1.02]' :
                    bulkFile ? 'border-emerald-500/50 bg-emerald-50/10' :
                    'border-border hover:border-foreground/30 hover:bg-muted/30'
                }`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleBulkFileSelect}
                    accept="application/pdf"
                    className="hidden"
                />

                {bulkFile ? (
                    <div className="flex flex-col items-center text-center space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center">
                            <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                {bulkFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {(bulkFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive mt-2 h-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeBulkFile();
                            }}
                        >
                            <X className="h-4 w-4 mr-2" /> Remove
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 bg-muted/50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileUp className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                Drop massive PDF here
                            </p>
                            <p className="text-xs text-muted-foreground px-4">
                                One monolithic PDF containing hundreds of scripts. AI will slice it automatically.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <Button
                className="w-full h-14 text-sm font-semibold tracking-wide bg-foreground text-background hover:bg-foreground/90 transition-all rounded-lg mt-auto"
                onClick={handleStartCloudMarking}
                disabled={loading || uploadingScheme || !bulkFile}
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Initializing Engine...
                    </span>
                ) : (
                    "Launch Cloud Session"
                )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
                This is a heavy asynchronous process. You may close the tab after initialization.
            </p>
        </div>

      </div>
    </div>
  );
}
