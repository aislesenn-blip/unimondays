"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
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
  Link as LinkIcon,
  Loader2,
  Info
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
  id: string;
  studentId: string | null;
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
    id: string;
    title: string;
    status: string;
    strictness?: string;
    type: string;
    mode: string | null;
    submissionsCount: number;
  };
  submissions: SubmissionWithScore[];
}

export function WorkDetailsClient({ sessionId, workId, sessionCode, work, submissions }: WorkDetailsClientProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [auditStudentName, setAuditStudentName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("graded");
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const isOfflineMode = work.mode === "UPLOAD" || work.mode === "HYBRID";

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(submissions.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleStudent = (subId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, subId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== subId));
    }
  };

  const handleBulkAction = async (action: string) => {
    setLoadingAction(true);
    setStatusMessage(null);

    if (action === "grade") {
       try {
         const res = await fetch(`/api/assessments/${workId}/grade-all`, { method: "POST" });
         if (res.ok) setStatusMessage("Grading started in background.");
         else setStatusMessage("Failed to start grading.");
       } catch (e) {
         setStatusMessage("Error triggering grading.");
       }
    } else {
       console.log(`Bulk Action Triggered: ${action} for ${selectedStudents.length} items`);
       setStatusMessage(`Action '${action}' processed for ${selectedStudents.length} items.`);
    }

    setSelectedStudents([]);
    setLoadingAction(false);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files?.length) return;
     setIsBulkUploading(true);
     setStatusMessage("Uploading scripts...");

     const formData = new FormData();
     formData.append('quizId', workId);
     Array.from(e.target.files).forEach(file => {
         formData.append('files', file);
     });

     try {
         const res = await fetch('/api/submissions/bulk', { method: 'POST', body: formData });
         const data = await res.json();
         if (res.ok) {
             setStatusMessage(`Uploaded ${data.results.length} scripts. Processing started.`);
             window.location.reload();
         } else {
             setStatusMessage("Upload failed: " + (data.error || "Unknown error"));
         }
     } catch (e) {
         setStatusMessage("Upload network error.");
     } finally {
         setIsBulkUploading(false);
     }
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
           <Button variant="outline" onClick={() => (document.getElementById('bulk-upload') as HTMLInputElement)?.click()} disabled={isBulkUploading}>
             {isBulkUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
             Upload Scanned Scripts
           </Button>
           <Input id="bulk-upload" type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBulkUpload} />

           <Button variant="outline" onClick={() => console.log('Excel export triggered')}>
             <Download className="mr-2 h-4 w-4" />
             Export Excel
           </Button>
           <Button
             onClick={() => handleBulkAction("grade")}
             disabled={work.status === "GRADING" || loadingAction}
           >
             {loadingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
             {work.status === "GRADING" ? "Grading..." : "Start Grading"}
           </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> {statusMessage}
        </div>
      )}

      <Tabs defaultValue="graded" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
            <TabsTrigger value="graded">Matched & Graded</TabsTrigger>
            {/* Removed Mock Unmatched Tab */}
        </TabsList>

        <TabsContent value="graded" className="space-y-6">
          <ResultControlPanel
            workId={work.id}
            initialStatus={work.status}
            initialStrictness={work.strictness || "MODERATE"}
          />

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
                          {submission.studentName || "Unknown Student"}
                        </Link>
                      </TableCell>
                      <TableCell>{submission.regNo || "N/A"}</TableCell>
                      <TableCell className="text-muted-foreground">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "-"}</TableCell>
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
      </Tabs>

      <BulkActionsBar
        selectedCount={selectedStudents.length}
        onAction={handleBulkAction}
      />
    </div>
  );
}
