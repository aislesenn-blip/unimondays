"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  RefreshCw,
  Upload,
  FileDigit,
  BrainCircuit,
  Link as LinkIcon
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ResultControlPanel } from "@/components/dashboard/ResultControlPanel";
import { AuditTrailSheet } from "@/components/dashboard/AuditTrailSheet";
import { BulkActionsBar } from "@/components/dashboard/BulkActionsBar";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubmissionWithScore {
  id: number;
  studentId: number | null;
  studentName: string;
  regNo: string;
  status: string;
  submittedAt: Date;
  score: number;
  maxScore: number;
  confidence: number | null;
  filePath?: string | null;
}

interface WorkDetailsClientProps {
  sessionId: string;
  workId: string;
  sessionCode: string;
  work: {
    id: number;
    title: string;
    status: string;
    type: string;
    mode: string | null;
    submissionsCount: number;
  };
  submissions: SubmissionWithScore[];
}

const MOCK_UNMATCHED = [
  { id: 'u1', imageUrl: 'https://placehold.co/600x200/e2e8f0/64748b?text=Header+Crop+A', confidence: 'Low', time: '10:42 AM' },
];

export function WorkDetailsClient({ sessionId, workId, sessionCode, work, submissions }: WorkDetailsClientProps) {
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [auditStudentName, setAuditStudentName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("graded");

  const isOfflineMode = work.mode === "UPLOAD" || work.mode === "HYBRID";

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(submissions.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleStudent = (subId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, subId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== subId));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === "grade") {
       try {
         const res = await fetch(`/api/assessments/${workId}/grade-all`, { method: "POST" });
         if (res.ok) alert("Grading started in background.");
         else alert("Failed to start grading.");
       } catch (e) {
         alert("Error triggering grading.");
       }
    } else {
       alert(`Bulk Action Triggered: ${action} for ${selectedStudents.length} items`);
    }
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
            <Badge variant="outline" className="text-xs font-semibold">
              {work.status}
            </Badge>
            {isOfflineMode && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                <FileDigit className="mr-1 h-3 w-3" /> Offline / Scanned
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{sessionCode} • {work.type} • {work.submissionsCount} Submissions</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
           <Button variant="outline" onClick={() => alert('Excel exported!')}>
             <Download className="mr-2 h-4 w-4" />
             Export Excel
           </Button>
           <Button
             onClick={() => handleBulkAction("grade")}
             disabled={work.status === "GRADING"}
           >
             <BrainCircuit className="mr-2 h-4 w-4" />
             {work.status === "GRADING" ? "Grading..." : "Start Grading"}
           </Button>
        </div>
      </div>

      <Tabs defaultValue="graded" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {isOfflineMode && (
          <TabsList>
            <TabsTrigger value="graded">Matched & Graded</TabsTrigger>
            <TabsTrigger value="unmatched" className="relative">
              Unmatched Scripts
              <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                {MOCK_UNMATCHED.length}
              </span>
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="graded" className="space-y-6">
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
                   <span>Graded ({submissions.filter(s => s.status === 'GRADED').length})</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="h-2 w-2 rounded-full bg-yellow-500" />
                   <span>Flagged ({submissions.filter(s => s.status === 'FLAGGED').length})</span>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedStudents.length === submissions.length && submissions.length > 0}
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
                  {submissions.map((submission) => (
                    <TableRow key={submission.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(submission.id)}
                          onCheckedChange={(checked) => toggleStudent(submission.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/sessions/${sessionId}/work/${workId}/grade/${submission.id}`} className="hover:text-primary hover:underline block w-full h-full transition-colors">
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
                        {submission.confidence ? `${submission.confidence.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Student Action</DropdownMenuLabel>
                              <DropdownMenuItem>View Submission</DropdownMenuItem>
                              <DropdownMenuItem>Flag for Review</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {submissions.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                         No submissions yet.
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unmatched" className="space-y-4">
           <div className="text-center py-8">
             <p className="text-muted-foreground">Feature coming soon.</p>
           </div>
        </TabsContent>
      </Tabs>

      <BulkActionsBar
        selectedCount={selectedStudents.length}
        onAction={handleBulkAction}
      />
    </div>
  );
}
