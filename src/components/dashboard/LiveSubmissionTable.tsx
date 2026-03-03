"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmissionDrawer } from "@/components/dashboard/SubmissionDrawer";
import { Loader2, CheckCircle2, AlertTriangle, FileText, RotateCw, XCircle, ShieldCheck, ShieldAlert, Shield, SearchCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

// ... (interface Submission remains the same) ...
interface Submission {
  id: string;
  studentName?: string;
  studentRegNo?: string;
  status: string;
  submittedAt: string;
  feedback?: string; 
  score?: {
    totalMarks: number;
    detectedIdentity?: string;
  };
  user?: {
    fullName?: string;
    email?: string;
  };
  workSessionId?: string;
  confidenceScore?: number;
}


export function LiveSubmissionTable({ initialSubmissions, workSession }: { initialSubmissions: any[], workSession: any }) {
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions || []);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/work-sessions/${workSession.id}/submissions`);
        if (res.ok) {
          const data = await res.json();
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

          toast.success("Reprocessing Started. The system is re-evaluating the submission.");
          setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'PENDING' } : s));
      } catch (e) {
          toast.error("Failed to start reprocessing. Please try again.");
      } finally {
          setRetrying(null);
      }
  };

  const getErrorTooltip = (jsonFeedback: string) => {
      try {
          const data = JSON.parse(jsonFeedback);
          return data.error || "Unknown system error.";
      } catch {
          return "Could not parse error details.";
      }
  };

  const getCertaintyBadge = (certainty: number | null) => {
      if (certainty === null || certainty === undefined) return null;

      let colorClass = "";
      let icon = <Shield className="h-3 w-3" />;

      if (certainty >= 80) {
          colorClass = "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
          icon = <ShieldCheck className="h-3 w-3" />;
      } else if (certainty >= 50) {
          colorClass = "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
          icon = <ShieldAlert className="h-3 w-3" />;
      } else {
          colorClass = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
          icon = <ShieldAlert className="h-3 w-3" />;
      }

      return (
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger>
                      <Badge variant="outline" className={`flex items-center gap-1 cursor-help ${colorClass}`}>
                          {icon}
                          {Math.round(certainty)}%
                      </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p className="font-semibold">AI Certainty: {Math.round(certainty)}%</p>
                      <p className="text-xs">Represents the AI's confidence in its grading accuracy.</p>
                  </TooltipContent>
              </Tooltip>
          </TooltipProvider>
      );
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px] font-bold">Student Name</TableHead>
            <TableHead className="min-w-[120px] font-bold">Reg No</TableHead>
            <TableHead className="min-w-[140px]">Status</TableHead>
            <TableHead className="min-w-[100px]">AI Certainty</TableHead>
            <TableHead className="min-w-[140px]">Submitted At</TableHead>
            <TableHead className="text-right font-bold min-w-[80px]">Score</TableHead>
            <TableHead className="text-right min-w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!submissions || submissions.length === 0) ? (
            <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3 py-6">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div className="text-base font-medium text-foreground">Waiting for submissions</div>
                        <p className="text-sm max-w-sm mx-auto">
                            Students can join and submit their work using the class code: <br/>
                            <span className="font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-md inline-block mt-2 text-lg shadow-sm border border-primary/20">{workSession.workCode}</span>
                        </p>
                    </div>
                </TableCell>
            </TableRow>
          ) : (
            submissions?.map((sub) => {
              const detectedName = sub.score?.detectedIdentity;
              const studentName = detectedName || sub.user?.fullName || sub.studentName || 'Unknown Identity';
              const regNo = sub.studentRegNo || 'Unidentified';

              return (
              <TableRow key={sub.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="font-bold text-foreground">{studentName}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{regNo}</TableCell>
                <TableCell>
                  {(sub.status === 'PENDING' || sub.status === 'PROCESSING') ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 flex items-center gap-1.5 w-fit animate-pulse transition-all">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                    </Badge>
                  ) : (sub.status === 'GRADED' || sub.status === 'RELEASED') ? (
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 flex items-center gap-1.5 w-fit shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        Graded
                    </Badge>
                  ) : (sub.status === 'APPEALED') ? (
                     <Badge variant="destructive" className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200">
                         <AlertTriangle className="mr-1 h-3 w-3" />
                         Appeal
                     </Badge>
                  ) : (sub.status === 'FLAGGED') ? (
                     <div className="flex items-center gap-2">
                         <Badge variant="secondary" className="flex items-center gap-1.5 w-fit cursor-help bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100">
                            <SearchCheck className="h-3 w-3" />
                            Review Suggested
                         </Badge>
                         <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => handleRetry(sub.id)} disabled={retrying === sub.id}>
                            <RotateCw className={`h-3 w-3 ${retrying === sub.id ? 'animate-spin' : ''}`} />
                         </Button>
                     </div>
                  ) : (sub.status === 'FAILED') ? (
                     <div className="flex items-center gap-2">
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger>
                               <Badge variant="secondary" className="flex items-center gap-1.5 w-fit cursor-help">
                                  <AlertCircle className="h-3 w-3" />
                                  Processing Error
                               </Badge>
                             </TooltipTrigger>
                             <TooltipContent className="max-w-xs">
                               <p className="font-semibold">System Error:</p>
                               <p className="text-xs">{getErrorTooltip(sub.feedback || "{}")}</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                         <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => handleRetry(sub.id)} disabled={retrying === sub.id}>
                            <RotateCw className={`h-3 w-3 ${retrying === sub.id ? 'animate-spin' : ''}`} />
                         </Button>
                     </div>
                  ) : (
                    <Badge variant="outline">{sub.status}</Badge>
                  )}
                </TableCell>
                <TableCell>
                    {getCertaintyBadge(sub.confidenceScore)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}</TableCell>
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
