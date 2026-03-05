"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmissionDrawer } from "@/components/dashboard/SubmissionDrawer";
import { Loader2, CheckCircle2, AlertTriangle, FileText, RotateCw, XCircle, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface Submission {
  id: string;
  studentName?: string;
  studentRegNo?: string;
  status: string;
  submittedAt: string;
  feedback?: string; // JSON string containing error details
  score?: {
    totalMarks: number;
    detectedIdentity?: string; // OCR Extracted Name
  };
  user?: {
    fullName?: string;
    email?: string;
  };
  workSessionId?: string;
}

export function LiveSubmissionTable({ initialSubmissions, workSession }: { initialSubmissions: any[], workSession: any }) {
  // Ensure initialSubmissions is an array to prevent undefined map crash
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions || []);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    // Poll every 4 seconds to update status (Pending -> Graded/Failed)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/work-sessions/${workSession.id}/submissions`);
        if (res.ok) {
          const data = await res.json();
          // Ensure data is array
          if (Array.isArray(data)) {
            setSubmissions(data);
          }
        }
      } catch (e) {
        console.error("Polling failed", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [workSession.id]);

  const handleRetry = async (subId: string) => {
      setRetrying(subId);
      try {
          const res = await fetch(`/api/work-sessions/${workSession.id}/submissions/${subId}/retry`, {
              method: 'POST'
          });
          if (!res.ok) throw new Error("Retry failed");

          toast.success("Grading Retried. System is reprocessing.");

          // Optimistic update
          setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'PENDING' } : s));
      } catch (e) {
          toast.error("Failed to retry grading. Please try again.");
      } finally {
          setRetrying(null);
      }
  };

  const getErrorTooltip = (jsonFeedback: string) => {
      try {
          const data = JSON.parse(jsonFeedback);
          return data.error || "Unknown Error";
      } catch {
          return "System Error";
      }
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px] font-bold">Student Name</TableHead>
            <TableHead className="min-w-[120px] font-bold">Reg No</TableHead>
            <TableHead className="min-w-[140px]">Status</TableHead>
            <TableHead className="min-w-[140px]">Submitted At</TableHead>
            <TableHead className="text-right font-bold min-w-[80px]">Score</TableHead>
            <TableHead className="text-right min-w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!submissions || submissions.length === 0) ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No submissions yet. Share code <span className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded">{workSession.workCode}</span> with students.
              </TableCell>
            </TableRow>
          ) : (
            submissions?.map((sub) => {
              // Identity Separation Logic
              // Name: Prioritize AI Detected -> User FullName -> Fallback
              const detectedName = sub.score?.detectedIdentity;
              const studentName = detectedName || sub.user?.fullName || sub.studentName || 'Unknown Identity';

              // Reg No: Prioritize Student Reg No -> AI Detected Identity -> 'Unidentified'
              // MANDATE 2: NEVER show email in Reg No column.
              const regNo = sub.studentRegNo || sub.score?.detectedIdentity || 'Unidentified';

              return (
              <TableRow key={sub.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="font-bold text-foreground">
                    {studentName}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                    {regNo}
                </TableCell>
                <TableCell>
                  {/* Status Logic with Resilience UI */}
                  {(sub.status === 'PENDING' || sub.status === 'PROCESSING') ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 flex items-center gap-1.5 w-fit animate-pulse transition-all">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Grading...
                    </Badge>
                  ) : (sub.status === 'GRADED' || sub.status === 'RELEASED') ? (
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 flex items-center gap-1.5 w-fit shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        Graded
                    </Badge>
                  ) : (sub.status === 'APPEALED' || (sub.appeals && sub.appeals.length > 0 && sub.appeals[0].status === 'PENDING')) ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge variant="destructive" className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 cursor-help">
                                    <AlertTriangle className="mr-1 h-3 w-3" />
                                    Appeal
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-bold">Reason:</p>
                                <p className="text-xs max-w-xs">{sub.appeals && sub.appeals[0]?.reason}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  ) : (sub.status === 'FLAGGED') ? (
                    <Badge
                      variant="default"
                      className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 flex items-center gap-1.5 w-fit shadow-sm cursor-pointer"
                      onDoubleClick={() => handleRetry(sub.id)}
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        Graded {retrying === sub.id && <RotateCw className="h-3 w-3 animate-spin ml-1" />}
                    </Badge>
                  ) : (sub.status === 'FAILED') ? (
                     <div className="flex items-center gap-2">
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger>
                               <Badge variant="destructive" className="flex items-center gap-1.5 w-fit cursor-help">
                                  <XCircle className="h-3 w-3" />
                                  Failed
                               </Badge>
                             </TooltipTrigger>
                             <TooltipContent className="max-w-xs bg-destructive text-destructive-foreground border-destructive">
                               <p className="font-semibold">System Error:</p>
                               <p className="text-xs">{getErrorTooltip(sub.feedback || "{}")}</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>

                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted"
                            onClick={() => handleRetry(sub.id)}
                            disabled={retrying === sub.id}
                         >
                            <RotateCw className={`h-3 w-3 ${retrying === sub.id ? 'animate-spin' : ''}`} />
                         </Button>
                     </div>
                  ) : (
                    <Badge variant="outline">{sub.status}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-base">
                  {sub.score ? (
                      <span className={sub.score.totalMarks >= (workSession.totalMarks * 0.5) ? "text-green-600" : "text-amber-600"}>
                          {sub.score.totalMarks}
                      </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <SubmissionDrawer submission={{...sub, workSession}} />
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </div>
  );
}
