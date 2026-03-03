'use client';

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { verifyWorkCode, submitAssignment } from "@/app/actions/student";
import { toast } from "sonner";

export default function StudentSubmissionPortal() {
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1); // 1: Code, 2: Upload
  const [file, setFile] = useState<File | null>(null);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<{ title: string; id: string; className: string; deadline: Date | null } | null>(null);

  const handleCodeSubmit = () => {
    startVerifyTransition(async () => {
      const result = await verifyWorkCode(code.toUpperCase());
      if (result.success && result.workSession) {
        setSessionDetails(result.workSession);
        setStep(2);
        toast.success(`Verified! Welcome to ${result.workSession.className}.`);
      } else {
        toast.error(result.error || "Invalid work code.");
      }
    });
  };

  const handleUpload = () => {
    if (!file || !sessionDetails) return;

    startSubmitTransition(async () => {
        const formData = new FormData();
        formData.append("workSessionId", sessionDetails.id);
        formData.append("studentFile", file);

        const result = await submitAssignment(formData);

        if (result.success) {
            setSuccess(true);
            toast.success("Your assignment has been submitted successfully.");
        } else {
            toast.error(result.error || "Submission failed. Please try again.");
        }
    });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in">
        <Card className="w-full max-w-md text-center py-8">
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Submission Received</h2>
            <p className="text-muted-foreground">Your work has been uploaded and queued for marking.</p>
            <Button onClick={() => { setSuccess(false); setStep(1); setCode(""); setFile(null); setSessionDetails(null); }}>
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-blue-100 dark:from-indigo-900/10 dark:via-background dark:to-blue-900/10 p-4 font-sans">
      <Card className="w-full max-w-md shadow-lg border-black/5">
        <CardHeader>
          <CardTitle className="text-2xl">Student Submission Portal</CardTitle>
          <CardDescription>
            {step === 1 ? "Enter your unique work code to begin." : `Uploading for: ${sessionDetails?.title}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <div className="space-y-2">
              <Input
                placeholder="WORK-CODE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center h-14 text-2xl font-mono tracking-widest uppercase placeholder:text-muted-foreground/50"
              />
            </div>
          ) : (
            <div className="space-y-4">
                {sessionDetails?.deadline && new Date(sessionDetails.deadline) < new Date() && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="h-5 w-5" />
                        <p>The deadline for this assignment has passed. Late submissions may be penalized.</p>
                    </div>
                )}
                <label htmlFor="submission-upload" className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                  <span className="text-sm font-medium text-primary hover:underline">
                    {file ? file.name : "Select your file to upload"}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">PDF, DOCX, PNG, or JPG</p>
                </label>
                <Input
                    type="file"
                    id="submission-upload"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                />
            </div>
          )}
        </CardContent>
        <CardFooter>
          {step === 1 ? (
            <Button className="w-full h-11" onClick={handleCodeSubmit} disabled={isVerifying || code.length < 4}>
              {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Verifying...</> : "Verify Code"}
            </Button>
          ) : (
            <Button className="w-full h-11" onClick={handleUpload} disabled={isSubmitting || !file}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Assignment"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
