"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Submission {
    id: string;
    title: string;
    workCode: string;
    classCode: string;
    submittedAt: string;
    status: string;
    score: number | null;
    totalMarks: number;
    feedback: any;
    filePath: string;
}

export function SubmissionList({ refreshTrigger }: { refreshTrigger: number }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [refreshTrigger]);

  const fetchSubmissions = async () => {
    try {
        const res = await fetch('/api/student/submissions');
        if (res.ok) {
            const data = await res.json();
            setSubmissions(data);
        }
    } catch (error) {
        console.error("Failed to fetch submissions");
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8 text-muted-foreground">Loading submissions...</div>;

  if (submissions.length === 0) {
      return (
          <div className="text-center p-12 border-2 border-dashed rounded-xl">
              <h3 className="text-lg font-medium">No submissions yet</h3>
              <p className="text-muted-foreground">Enter a code above to get started.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-xl font-bold tracking-tight">The Vault <span className="text-muted-foreground text-sm font-normal ml-2">(My Past Papers)</span></h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {submissions.map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} />
            ))}
        </div>
    </div>
  );
}

function SubmissionCard({ submission }: { submission: Submission }) {
    // Parse feedback if string
    let feedbackObj: any = {};
    try {
        if (typeof submission.feedback === 'string') {
            feedbackObj = JSON.parse(submission.feedback);
        } else {
            feedbackObj = submission.feedback || {};
        }
    } catch (e) {}

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="outline" className="mb-2 font-mono">{submission.workCode}</Badge>
                        <CardTitle className="text-lg leading-tight">{submission.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{submission.classCode}</p>
                    </div>
                    {submission.score !== null ? (
                        <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">{submission.score}</div>
                            <div className="text-xs text-muted-foreground">/ {submission.totalMarks}</div>
                        </div>
                    ) : (
                        <Badge variant="secondary">
                            {submission.status === 'PENDING' ? <Clock className="h-3 w-3 mr-1" /> : null}
                            {submission.status}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                </div>

                <SubmissionDetailDialog submission={submission} feedback={feedbackObj} />
            </CardContent>
        </Card>
    );
}

function SubmissionDetailDialog({ submission, feedback }: { submission: Submission, feedback: any }) {
    const [appealOpen, setAppealOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [appealing, setAppealing] = useState(false);

    const handleAppeal = async () => {
        if (!reason) return;
        setAppealing(true);
        try {
            const res = await fetch(`/api/student/submissions/${submission.id}/appeal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            if (!res.ok) throw new Error("Appeal failed");
            toast.success("Appeal sent to Lecturer");
            setAppealOpen(false);
            // Ideally trigger refresh here, but for now just UI update via toast
        } catch (error) {
            toast.error("Failed to submit appeal");
        } finally {
            setAppealing(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{submission.title}</DialogTitle>
                    <DialogDescription>
                        Submitted on {new Date(submission.submittedAt).toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 py-4">
                        {/* Status Banner */}
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                            <div>
                                <h4 className="font-semibold">Status: {submission.status}</h4>
                                {submission.score === null && (
                                    <p className="text-sm text-muted-foreground">
                                        Grades are hidden until released by lecturer.
                                    </p>
                                )}
                            </div>
                            {submission.score !== null && (
                                <div className="text-3xl font-bold">
                                    {submission.score} <span className="text-lg text-muted-foreground font-normal">/ {submission.totalMarks}</span>
                                </div>
                            )}
                        </div>

                        {/* AI Feedback Section */}
                        {submission.score !== null && feedback && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 p-1 rounded">AI</span> Remarks
                                </h3>

                                {feedback.strengths && (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                        <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
                                        <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                                            {feedback.strengths.map((s: string, i: number) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {feedback.weaknesses && (
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                        <h4 className="font-medium text-amber-800 mb-2">Areas for Improvement</h4>
                                        <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                                            {feedback.weaknesses.map((w: string, i: number) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {feedback.improvement && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm">
                                        <span className="font-semibold">Action Plan:</span> {feedback.improvement}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Appeal Section */}
                        {submission.score !== null && submission.status !== 'APPEALED' && submission.status !== 'FLAGGED' && (
                            <div className="pt-8 border-t">
                                <Button variant="ghost" className="text-muted-foreground hover:text-destructive w-full" onClick={() => setAppealOpen(!appealOpen)}>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Dispute Grade
                                </Button>

                                {appealOpen && (
                                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <Textarea
                                            placeholder="Reason for appeal..."
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setAppealOpen(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleAppeal} disabled={appealing || !reason}>
                                                {appealing ? "Sending..." : "Submit Appeal"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
