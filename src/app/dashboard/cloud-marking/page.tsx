"use client";

import { useState } from "react";
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

// Reusing existing components logic where applicable, or inline for specific new feature
import { Textarea } from "@/components/ui/textarea";

export default function CloudMarkingPage() {
  const router = useRouter();
  const [cloudLink, setCloudLink] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [loading, setLoading] = useState(false);

  // Calibration State
  const [strictness, setStrictness] = useState("MODERATE");
  const [calibration, setCalibration] = useState({
    methodology: "Standard",
    grammar: "Ignore unless critical",
    verbosity: "Concise",
    incomplete: "Grade present work",
    custom: ""
  });

  const handleStartCloudMarking = async () => {
    if (!cloudLink || !sessionTitle) {
      toast.error("Please provide a Session Title and Cloud Link");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cloud-marking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessionTitle,
          cloudLink,
          totalMarks,
          markingScheme,
          strictness,
          calibration
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start session");

      toast.success("Cloud Marking Session Started!");
      router.push(`/dashboard/cloud-marking/${data.id}`);

    } catch (error: any) {
      toast.error(error.message);
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
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <CheckCircle2 className="h-5 w-5" /> How Cloud Marking Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2 text-center">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm flex items-center justify-center text-blue-600 font-bold border border-blue-100">1</div>
              <h3 className="font-semibold text-sm">Scan</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan all student exams into a single large PDF or folder using your department scanner.
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm flex items-center justify-center text-blue-600 font-bold border border-blue-100">2</div>
              <h3 className="font-semibold text-sm">Upload</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload files to Google Drive, OneDrive, or Dropbox.
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm flex items-center justify-center text-blue-600 font-bold border border-blue-100">3</div>
              <h3 className="font-semibold text-sm">Generate Link</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set permission to "Anyone with the link can view" and copy the link.
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="h-10 w-10 mx-auto bg-white dark:bg-card rounded-full shadow-sm flex items-center justify-center text-blue-600 font-bold border border-blue-100">4</div>
              <h3 className="font-semibold text-sm">Process</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste the link below. The AI will fetch, slice, grade, and organize submissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-3">
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
                            <Label>Marking Scheme / Gold Standard</Label>
                            <Textarea
                                placeholder="Paste your marking scheme text here, or describe the gold standard answer..."
                                className="min-h-[150px]"
                                value={markingScheme}
                                onChange={(e) => setMarkingScheme(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                * For file-based marking schemes (PDF), please upload to the same cloud folder and name it "MARKING_SCHEME.pdf".
                            </p>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="calibration">
                                <AccordionTrigger className="text-sm font-medium">Advanced Calibration</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Methodology</Label>
                                            <Input
                                                className="h-8"
                                                value={calibration.methodology}
                                                onChange={(e) => setCalibration({...calibration, methodology: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Custom Instruction</Label>
                                            <Input
                                                className="h-8"
                                                placeholder="e.g. Ignore spelling mistakes"
                                                value={calibration.custom}
                                                onChange={(e) => setCalibration({...calibration, custom: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                    </div>
                </CardContent>
            </Card>
        </div>

        {/* MANDATE 2: INPUT (Right Col) */}
        <div className="space-y-6">
            <Card className="h-full border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-primary" /> Start Processing
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label>Cloud Storage Link</Label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="https://drive.google.com/..."
                                    className="pl-9"
                                    value={cloudLink}
                                    onChange={(e) => setCloudLink(e.target.value)}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Supports Google Drive, OneDrive, Dropbox public links.
                            </p>
                         </div>

                         <Separator />

                         <Button
                            className="w-full h-12 text-lg font-semibold shadow-xl shadow-primary/20"
                            onClick={handleStartCloudMarking}
                            disabled={loading}
                         >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Initiating...
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
