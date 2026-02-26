"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmissionDrawer } from "@/components/dashboard/SubmissionDrawer";
import { Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

interface Submission {
  id: string;
  studentName?: string;
  studentRegNo?: string;
  status: string;
  submittedAt: string;
  score?: {
    totalMarks: number;
  };
  user?: {
    fullName?: string;
    email?: string;
  };
  workSessionId?: string; // We might need this if we don't pass full context
}

export function LiveSubmissionTable({ initialSubmissions, workSession }: { initialSubmissions: any[], workSession: any }) {
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);

  useEffect(() => {
    // Only poll if there are pending submissions
    // Check if ANY submission is PENDING or PROCESSING
    const hasPending = submissions.some(s => s.status === 'PENDING' || s.status === 'PROCESSING');

    // If no pending, no need to poll (unless we want to catch NEW submissions? Yes, "Zero Friction")
    // The requirement is "When the Lecturer opens their dashboard... see which papers are Grading..."
    // But also new submissions appearing magically is good.
    // Let's poll always for now, or back off if idle.
    // 3 seconds is aggressive but "Magic".

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/work-sessions/${workSession.id}/submissions`);
        if (res.ok) {
          const data = await res.json();
          // Check if data changed to avoid re-renders? React handles this mostly.
          setSubmissions(data);
        }
      } catch (e) {
        console.error("Polling failed", e);
      }
    }, 4000); // 4 seconds poll

    return () => clearInterval(interval);
  }, [workSession.id]); // Removed 'submissions' dependency to avoid reset loop, let interval run

  return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted At</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No submissions yet. Share code <span className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded">{workSession.workCode}</span> with students.
              </TableCell>
            </TableRow>
          ) : (
            submissions.map((sub) => (
              <TableRow key={sub.id} className="transition-colors hover:bg-muted/50">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{sub.user?.fullName || sub.studentName || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{sub.studentRegNo || sub.user?.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {/* MAGIC UI: Status Badges */}
                  {(sub.status === 'PENDING' || sub.status === 'PROCESSING') ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 flex items-center gap-1.5 w-fit animate-pulse transition-all">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Grading in Progress...
                    </Badge>
                  ) : (sub.status === 'GRADED' || sub.status === 'RELEASED') ? (
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 flex items-center gap-1.5 w-fit shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        Graded / Completed
                    </Badge>
                  ) : sub.status === 'FLAGGED' ? (
                     <Badge variant="destructive" className="flex items-center gap-1.5 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        Flagged
                     </Badge>
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
            ))
          )}
        </TableBody>
      </Table>
  );
}
