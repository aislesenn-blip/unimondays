"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle } from "lucide-react";

export default function QuizEntry() {
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1); // 1: Code, 2: Upload
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [quizDetails, setQuizDetails] = useState<{ title: string; id: number } | null>(null);

  const handleCodeSubmit = async () => {
    if (code.length > 3) {
      try {
          const res = await fetch("/api/quiz/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code })
          });
          if (res.ok) {
              const data = await res.json();
              setQuizDetails({ title: data.quizTitle, id: data.quizId });
              setStep(2);
          } else {
              alert("Invalid Code");
          }
      } catch (e) {
          alert("Error verifying code");
      }
    } else {
      alert("Invalid Code Length");
    }
  };

  const handleUpload = async () => {
    if (!file || !quizDetails) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("quizCode", code);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        // Trigger processing immediately for student
        await fetch("/api/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: data.submissionId })
        });
        setSuccess(true);
      } else {
        alert("Upload Failed");
      }
    } catch (e) {
      alert("Error");
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in">
        <Card className="w-full max-w-md text-center py-8">
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Submission Received</h2>
            <p className="text-muted-foreground">Your script has been uploaded and queued for AI marking.</p>
            <Button onClick={() => { setSuccess(false); setStep(1); setCode(""); setFile(null); }}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader>
          <CardTitle>Student Assessment Portal</CardTitle>
          <CardDescription>
            {step === 1 ? "Enter your unique quiz code to begin." : `Upload script for: ${quizDetails?.title}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <div className="space-y-2">
              <Input
                placeholder="Quiz Code (e.g. MATH-101)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest uppercase"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-4" />
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="quiz-upload"
              />
              <label htmlFor="quiz-upload" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                {file ? file.name : "Select Script File"}
              </label>
              <p className="text-xs text-muted-foreground mt-2">PDF (Multipage) or Images</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {step === 1 ? (
            <Button className="w-full" onClick={handleCodeSubmit} disabled={!code}>
              Verify Code
            </Button>
          ) : (
            <Button className="w-full" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : "Submit Assessment"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
