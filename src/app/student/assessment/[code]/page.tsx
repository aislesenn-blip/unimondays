"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, AlertTriangle, FileText, Upload, CheckCircle2, Play, Info, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizDetails {
  id: string;
  title: string;
  deadline: string | null;
  totalMarks: number;
  lecturer: {
    fullName: string | null;
  };
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // Default 60 mins
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submissionFileUrl, setSubmissionFileUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const res = await fetch(`/api/quiz/${code}`);
        if (res.ok) {
          const data = await res.json();
          setQuiz(data);
          // Calculate time left based on deadline if exists, else default
          // For now, sticking to a session timer or deadline
        } else {
          setError("Invalid Assessment Code");
        }
      } catch (e) {
        setError("Failed to load assessment details");
      } finally {
        setLoading(false);
      }
    }
    fetchQuiz();
  }, [code]);

  // Timer logic
  useEffect(() => {
    if (!started || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'submissions');
      formData.append('bucket', 'exam_pdfs');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setSubmissionFileUrl(data.path);
        } else {
          // Use console or UI error state, no alert
          console.error("Upload failed");
        }
      } catch (error) {
        console.error("Submission upload failed", error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!submissionFileUrl) {
       // Require file
       return;
    }

    setSubmitting(true);

    try {
        const res = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                fileUrl: submissionFileUrl,
                // answers: {} // No structured answers for now
            })
        });

        if (res.ok) {
            setSubmitted(true);
            setTimeout(() => {
                router.push("/student/dashboard");
            }, 2000);
        } else {
            console.error("Submission failed");
        }
    } catch (e) {
        console.error("Error submitting", e);
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (error || !quiz) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
             <Card className="max-w-md w-full border-destructive">
                 <CardHeader>
                     <CardTitle className="text-destructive flex items-center gap-2">
                         <AlertCircle className="h-5 w-5" /> Error
                     </CardTitle>
                     <CardDescription>{error || "Quiz not found"}</CardDescription>
                 </CardHeader>
                 <CardFooter>
                     <Button onClick={() => router.push('/student/dashboard')}>Return to Dashboard</Button>
                 </CardFooter>
             </Card>
        </div>
      );
  }

  if (!started && !submitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="max-w-xl w-full border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-mono tracking-widest uppercase">{code}</span>
                    </div>
                    <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                    <CardDescription>Lecturer: {quiz.lecturer.fullName || "Unknown"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border p-4 rounded-lg bg-secondary/10">
                            <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Duration</span>
                            <span className="text-xl font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" /> 60 Mins
                            </span>
                        </div>
                        <div className="border p-4 rounded-lg bg-secondary/10">
                            <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Marks</span>
                            <span className="text-xl font-bold flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary" /> {quiz.totalMarks || 100}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Instructions</h4>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                            <li>Ensure you have a stable internet connection.</li>
                            <li>Do not refresh the page once the assessment starts.</li>
                            <li>Upload your script (PDF/Images) when ready.</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button size="lg" className="w-full text-lg h-12" onClick={() => setStarted(true)}>
                        <Play className="mr-2 h-5 w-5" /> Start Assessment
                    </Button>
                </CardFooter>
            </Card>
        </div>
      );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full text-center p-8 animate-in zoom-in duration-300">
          <div className="mx-auto h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Submission Received</h2>
          <p className="text-muted-foreground mb-6">
            Your assessment for code <span className="font-mono font-bold text-foreground">{code}</span> has been successfully uploaded.
          </p>
          <Button className="w-full" onClick={() => router.push("/student/dashboard")}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg">{quiz.title}</h1>
            <p className="text-xs text-muted-foreground font-mono">CODE: {code}</p>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full border font-mono font-bold text-lg",
          timeLeft < 300 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-secondary text-foreground"
        )}>
          <Clock className="h-5 w-5" />
          {formatTime(timeLeft)}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-8">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Assessment Started
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p>Please refer to the question paper provided by your lecturer or displayed in class.</p>
            <p>Upload your written answer script below.</p>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
             <CardHeader>
                <CardTitle>Script Submission</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center bg-muted/10">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Upload your answer script (Required)</p>
                  <Button variant="secondary" className="mt-4" onClick={() => (document.getElementById('submission-upload') as HTMLInputElement)?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Choose File
                  </Button>
                  <Input id="submission-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg" />
               </div>
               {submissionFileUrl && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded mt-4">
                    <CheckCircle className="h-4 w-4" /> Uploaded: {submissionFileUrl}
                  </div>
               )}
             </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 bg-background border-t p-6 flex justify-end gap-4 shadow-2xl">
        <Button size="lg" className="px-8" onClick={handleSubmit} disabled={!submissionFileUrl || submitting}>
            {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            Submit Assessment
        </Button>
      </footer>
    </div>
  );
}
