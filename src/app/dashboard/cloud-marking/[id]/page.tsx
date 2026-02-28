"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserPlus,
  ArrowRight,
  GitMerge,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BulkSessionData {
  id: string;
  title: string;
  status: string;
  processedFiles: number;
  totalFiles: number;
  unidentifiedCount: number;
  errorMessage?: string;
  submissions: any[]; // In a real app, this might be paginated
}

export default function CloudMarkingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [session, setSession] = useState<BulkSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Poll for status updates
  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    const fetchStatus = async () => {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/cloud-marking/${resolvedParams.id}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setSession(data);

          // Only stop main loader if session is technically "done" with the slicing/uploading phase.
          // Grading might still be happening in the background.
          if (data.status === 'READY' || data.status === 'COMPLETED' || data.status === 'FAILED') {
             setLoading(false);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000); // Poll every 3s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [params]);

  const [processingMessage, setProcessingMessage] = useState("AI is Grading & Organizing...");

  useEffect(() => {
    if (session?.status === 'PROCESSING' || session?.status === 'PENDING') {
      const messages = [
        "Slicing PDF Document...",
        "Extracting Student Identities...",
        "Applying v3.0 AI Evaluator...",
        "Cross-referencing Marking Scheme...",
        "Organizing Submissions..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setProcessingMessage(messages[i]);
        i = (i + 1) % messages.length;
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [session?.status]);

  // Derived Grading Progress
  const gradingProgress = session?.submissions?.length
      ? (session.submissions.filter((s: any) => ['GRADED', 'FLAGGED', 'FAILED'].includes(s.status)).length / session.submissions.length) * 100
      : 0;

  const isGradingComplete = session?.submissions?.length
      ? session.submissions.every((s: any) => ['GRADED', 'FLAGGED', 'FAILED'].includes(s.status))
      : false;

  const handleSyncToClass = async () => {
    // Ideally this opens a modal to select a class.
    // For this MVP/Sim, we will just simulate a "Create New Class" or "Sync to Default"
    toast.info("Feature: Sync to existing class (Coming Soon)");
  };

  const handleCreateNewClass = async () => {
      if (!session) return;
      setSyncing(true);
      try {
          const res = await fetch(`/api/cloud-marking/${session.id}/convert`, {
              method: 'POST'
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Conversion failed");
          }

          const data = await res.json();
          toast.success("Converted to Class successfully!");

          // Redirect to the newly created Class/WorkSession
          router.push(`/dashboard/classes/${data.classId}`);
      } catch (error: any) {
          toast.error(error.message);
      } finally {
          setSyncing(false);
      }
  };

  if (!session) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{session.title}</h1>
          <div className="flex items-center gap-3 mt-2">
             <Badge variant={session.status === 'READY' ? 'default' : session.status === 'FAILED' ? 'destructive' : 'secondary'}>
                {session.status === 'PROCESSING' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {session.status}
             </Badge>

             {/* Slicing Progress */}
             <span className="text-muted-foreground text-sm">
                {session.processedFiles} / {session.totalFiles} Pages Processed
             </span>

             {/* Grading Progress Indicator */}
             {session.status === 'READY' && !isGradingComplete && (
                 <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 flex items-center gap-1">
                     <Cpu className="h-3 w-3 animate-pulse" />
                     Grading: {Math.round(gradingProgress)}%
                 </Badge>
             )}
          </div>
        </div>
        <div className="flex gap-2">
           {session.status === 'READY' && (
               <>
                   <Button variant="outline" onClick={() => router.push('/dashboard/cloud-marking')}>
                        Cancel
                   </Button>
                   <Button
                        onClick={handleCreateNewClass}
                        disabled={syncing || !isGradingComplete}
                        className={!isGradingComplete ? "opacity-50 cursor-not-allowed" : ""}
                        title={!isGradingComplete ? "Wait for grading to finish" : "Sync to Class"}
                    >
                        {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitMerge className="mr-2 h-4 w-4" />}
                        Convert to Class
                   </Button>
               </>
           )}
        </div>
      </div>

      {/* FAILED STATE */}
      {session.status === 'FAILED' && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                  <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-destructive">Processing Failed</h3>
              <p className="text-sm text-destructive/80 max-w-lg">
                  {session.errorMessage || "An unexpected error occurred during cloud processing. Please check the file link and try again."}
              </p>
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => router.push('/dashboard/cloud-marking')}>
                  Return to Dashboard
              </Button>
          </div>
      )}

      {/* MANDATE 4: RECONCILIATION UI */}
      {(session.status === 'PROCESSING' || session.status === 'PENDING') ? (
          <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold min-h-[30px] transition-all duration-300">{processingMessage}</h3>
                  <p className="text-muted-foreground max-w-md">
                      The system is autonomously fetching, slicing, and grading the submissions.
                      Results will appear here shortly.
                  </p>
                  {/* Progress Bar Simulation */}
                   <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                       <div
                           className="h-full bg-primary transition-all duration-1000 ease-in-out"
                           style={{ width: `${session.totalFiles > 0 ? (session.processedFiles / session.totalFiles) * 100 : 5}%` }}
                       />
                   </div>
                   <p className="text-xs text-muted-foreground">
                       {Math.round(session.totalFiles > 0 ? (session.processedFiles / session.totalFiles) * 100 : 0)}% Complete
                   </p>
              </CardContent>
          </Card>
      ) : session.status === 'FAILED' ? null : (
          <div className="grid gap-6 md:grid-cols-2">
              {/* MATCHES */}
              <Card className="border-green-100 bg-green-50/20">
                  <CardHeader>
                      <CardTitle className="text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" /> Matched Students
                      </CardTitle>
                      <CardDescription>Scripts matched to existing database records.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="text-3xl font-bold text-green-800 mb-4">
                          {session.submissions?.filter((s: any) => s.userId || s.studentRegNo)?.length || 0}
                      </div>
                      <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                              These scripts have high-confidence identity matches.
                          </p>
                          <Button variant="outline" className="w-full border-green-200 hover:bg-green-50 text-green-700">
                              <GitMerge className="mr-2 h-4 w-4" /> Sync to Roster
                          </Button>
                      </div>
                  </CardContent>
              </Card>

              {/* UNIDENTIFIED */}
              <Card className="border-amber-100 bg-amber-50/20">
                  <CardHeader>
                      <CardTitle className="text-amber-700 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" /> Unidentified / New
                      </CardTitle>
                      <CardDescription>Scripts that need manual assignment.</CardDescription>
                  </CardHeader>
                  <CardContent>
                       <div className="text-3xl font-bold text-amber-800 mb-4">
                          {session.submissions?.filter((s: any) => !s.userId && !s.studentRegNo)?.length || 0}
                      </div>
                      <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                              Students not found in the roster or ID illegible.
                          </p>
                           <Button variant="outline" className="w-full border-amber-200 hover:bg-amber-50 text-amber-700">
                              <UserPlus className="mr-2 h-4 w-4" /> Add as New Students
                          </Button>
                      </div>
                  </CardContent>
              </Card>

              {/* LIVE TABLE PREVIEW */}
              <Card className="md:col-span-2">
                  <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                          <span>Submission Preview</span>
                          <span className="text-sm font-normal text-muted-foreground">
                              {session.submissions?.length} Submissions
                          </span>
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Identity</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Score</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {session.submissions?.map((sub: any) => (
                                  <TableRow key={sub.id}>
                                      <TableCell>
                                          <div className="flex flex-col">
                                              <span className="font-medium">
                                                  {sub.studentName || sub.studentRegNo || sub.score?.detectedIdentity || <span className="text-amber-600 italic">Unidentified</span>}
                                              </span>
                                              {(sub.studentName || sub.score?.detectedIdentity) && sub.studentRegNo && (
                                                  <span className="text-xs text-muted-foreground">{sub.studentRegNo}</span>
                                              )}
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          <Badge variant={sub.status === 'GRADED' ? 'default' : sub.status === 'FLAGGED' ? 'destructive' : 'secondary'}>
                                              {sub.status}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                          {sub.score?.totalMarks !== undefined ? sub.score.totalMarks : '-'}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
}
