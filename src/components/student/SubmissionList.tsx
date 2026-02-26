"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentResultDrawer } from "./ResultDrawer";
import { Loader2 } from "lucide-react";

export function SubmissionList() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch("/api/student/submissions");
        const data = await res.json();
        if (data.success) {
          setSubmissions(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch submissions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
        No submissions yet. Use the code above to submit your first assignment.
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assignment</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-medium">{sub.workSessionTitle}</TableCell>
              <TableCell className="text-muted-foreground">{sub.lecturerName}</TableCell>
              <TableCell>{new Date(sub.submittedAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={
                    sub.status === 'GRADED' ? 'default' :
                    sub.status === 'FLAGGED' ? 'destructive' :
                    sub.status === 'APPEALED' ? 'outline' : // Fallback
                    sub.status === 'WAITING_RELEASE' ? 'secondary' : 'outline'
                } className={sub.status === 'APPEALED' ? 'border-yellow-500 text-yellow-600' : ''}>
                  {sub.status === 'WAITING_RELEASE' ? 'Processing' : sub.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-bold">
                {sub.isReleased ? sub.score : '-'}
              </TableCell>
              <TableCell className="text-right">
                <StudentResultDrawer submission={sub} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
