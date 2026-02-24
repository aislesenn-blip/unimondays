"use client";

import { useParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SESSIONS, WORKS, SUBMISSIONS } from "@/lib/mock-data";
import {
  ArrowLeft,
  Download,
  MoreVertical,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ResultControlPanel } from "@/components/dashboard/ResultControlPanel";
import { AuditTrailSheet } from "@/components/dashboard/AuditTrailSheet";
import { BulkActionsBar } from "@/components/dashboard/BulkActionsBar";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

export default function WorkDetailsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const workId = params.workId as string;
  const session = SESSIONS.find(s => s.id === sessionId);
  const work = WORKS.find(w => w.id === workId) || WORKS[0];
  const submissions = SUBMISSIONS.filter(s => s.workId === work.id);

  // Fallback submissions if mock data is limited
  const displaySubmissions = submissions.length > 0 ? submissions : SUBMISSIONS;

  // State for enhancements
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [auditStudentName, setAuditStudentName] = useState<string | null>(null);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(displaySubmissions.map(s => s.studentId));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleBulkAction = (action: string) => {
    alert(`Bulk Action Triggered: ${action} for ${selectedStudents.length} items`);
    setSelectedStudents([]);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sessions/${sessionId}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
           <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{work.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              work.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
            }`}>
              {work.status}
            </span>
          </div>
          <p className="text-muted-foreground">{session?.courseCode} • {work.type} • {work.submissionsCount} Submissions</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
           <Button variant="outline">
             <Download className="mr-2 h-4 w-4" />
             Export Excel
           </Button>
           <Button variant="outline">
             <FileText className="mr-2 h-4 w-4" />
             View Report
           </Button>
        </div>
      </div>

      {/* ENHANCEMENT 1: Result Control Panel */}
      <ResultControlPanel />

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-4">
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student name or reg no..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <div className="flex items-center gap-1">
               <div className="h-2 w-2 rounded-full bg-emerald-500" />
               <span>Graded ({displaySubmissions.filter(s => s.status === 'GRADED').length})</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="h-2 w-2 rounded-full bg-yellow-500" />
               <span>Flagged ({displaySubmissions.filter(s => s.status === 'FLAGGED').length})</span>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedStudents.length === displaySubmissions.length && displaySubmissions.length > 0}
                    onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                  />
                </TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Reg No</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySubmissions.map((submission) => (
                <TableRow key={submission.id} className="group">
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(submission.studentId)}
                      onCheckedChange={(checked) => toggleStudent(submission.studentId, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/sessions/${sessionId}/work/${workId}/grade/${submission.studentId}`} className="hover:text-primary hover:underline block w-full h-full transition-colors">
                      {submission.studentName}
                    </Link>
                  </TableCell>
                  <TableCell>{submission.regNo}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      submission.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700' :
                      submission.status === 'FLAGGED' ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {submission.status === 'GRADED' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {submission.status === 'FLAGGED' && <AlertCircle className="mr-1 h-3 w-3" />}
                      {submission.status}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-base">
                    {submission.score} <span className="text-muted-foreground font-normal text-xs">/ {submission.maxScore}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {submission.confidence}%
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* ENHANCEMENT 3: Audit Trail Trigger */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View Marking Reasoning"
                        onClick={() => setAuditStudentName(submission.studentName)}
                      >
                         <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ENHANCEMENT 4: Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedStudents.length}
        onAction={handleBulkAction}
      />

      {/* ENHANCEMENT 3: Audit Trail Sheet */}
      {auditStudentName && (
        <AuditTrailSheet
          open={!!auditStudentName}
          onOpenChange={(open) => !open && setAuditStudentName(null)}
          studentName={auditStudentName}
        />
      )}

    </div>
  );
}
