"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Keep for simple view if needed
import { Loader2, Upload, MessageSquare, CheckCircle, AlertCircle, FileText, Download } from "lucide-react";
import * as XLSX from "xlsx";
import DataTable from "react-data-table-component";

interface Submission {
  id: number;
  studentRegNo: string;
  studentName: string | null;
  status: string;
  score?: {
    totalMarks: number;
    remarks: string;
    confidence: number;
  };
  submittedAt: string;
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [processing, setProcessing] = useState<number[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/results");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
        // Identify pending items and trigger process if needed (Client-driven queue)
        data.forEach((sub: Submission) => {
             if (sub.status === 'pending' && !processing.includes(sub.id)) {
                 triggerProcessing(sub.id);
             }
        });
      }
    } catch (e) {
      console.error("Failed to fetch results", e);
    }
  };

  const triggerProcessing = async (id: number) => {
      if (processing.includes(id)) return;
      setProcessing(prev => [...prev, id]);
      try {
          await fetch("/api/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ submissionId: id })
          });
      } catch (e) {
          console.error("Trigger error", e);
      } finally {
          setProcessing(prev => prev.filter(pid => pid !== id));
          fetchSubmissions();
      }
  }

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        alert("Upload Successful. Processing started.");
        triggerProcessing(data.submissionId);
        fetchSubmissions();
      } else {
        alert("Upload Failed");
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const handleChat = async () => {
    if (!chatQuery) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: chatQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatResponse(data.response);
      }
    } catch (e) {
      setChatResponse("Error connecting to AI.");
    } finally {
      setChatLoading(false);
    }
  };

  const downloadExcel = () => {
      const ws = XLSX.utils.json_to_sheet(submissions.map(s => ({
          ID: s.studentRegNo,
          Status: s.status,
          Marks: s.score?.totalMarks || 0,
          Remarks: s.score?.remarks || "",
          Date: s.submittedAt
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      XLSX.writeFile(wb, "Playbook_Results.xlsx");
  };

  const generateSummary = async () => {
      setSummaryLoading(true);
      try {
          const res = await fetch("/api/summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quizId: 1 }) // Hardcoded for now
          });
          const data = await res.json();
          setSummary(data.summary);
      } catch (e) {
          console.error("Summary error", e);
      } finally {
          setSummaryLoading(false);
      }
  };

  const exportZip = async () => {
      try {
          const res = await fetch("/api/export/zip", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quizId: 1 })
          });
          if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "Quiz_1_Results.zip";
              a.click();
          }
      } catch (e) {
          console.error("ZIP Export error", e);
      }
  };

  const exportTablePdf = async () => {
      try {
          const res = await fetch("/api/export/pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quizId: 1 })
          });
          if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "Quiz_1_Table.pdf";
              a.click();
          }
      } catch (e) {
          console.error("PDF Export error", e);
      }
  };

  const columns = [
      { name: "Reg No", selector: (row: Submission) => row.studentRegNo, sortable: true },
      { name: "Name", selector: (row: Submission) => row.studentName || "-", sortable: true },
      { name: "Status", selector: (row: Submission) => row.status, sortable: true, cell: (row: Submission) => (
          <div className={`flex items-center gap-2 ${
              row.status === 'graded' ? 'text-green-600' :
              row.status === 'flagged' ? 'text-red-600' :
              row.status === 'error' ? 'text-red-600' : 'text-blue-600'
          }`}>
              {row.status}
          </div>
      )},
      { name: "Score", selector: (row: Submission) => row.score?.totalMarks || 0, sortable: true },
      { name: "Confidence", selector: (row: Submission) => (row.score?.confidence || 0) + "%", sortable: true },
      { name: "Remarks", selector: (row: Submission) => row.score?.remarks || "-", wrap: true },
  ];

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Playbook Dashboard</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Lecturer Interface (Next.js Pure)</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={exportTablePdf}>
                <FileText className="mr-2 h-4 w-4" /> PDF Report
            </Button>
            <Button variant="outline" onClick={exportZip}>
                <Download className="mr-2 h-4 w-4" /> Batch ZIP
            </Button>
            <Button variant="outline" onClick={downloadExcel}>
                Excel
            </Button>
            <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}>
                <MessageSquare className="mr-2 h-4 w-4" /> AI Assistant
            </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending / Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.filter(s => s.status === 'processing' || s.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Graded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.filter(s => s.status === 'graded').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* HOD Summary */}
      <div className="mb-8">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>HOD Executive Summary</CardTitle>
                  <Button variant="ghost" size="sm" onClick={generateSummary} disabled={summaryLoading}>
                      {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Generate"}
                  </Button>
              </CardHeader>
              <CardContent>
                  {summary ? (
                      <p className="text-sm text-muted-foreground">{summary}</p>
                  ) : (
                      <p className="text-xs text-muted-foreground">Click generate to analyze failing trends.</p>
                  )}
              </CardContent>
          </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main Table */}
        <div className="md:col-span-2 space-y-6">
            <Card className="glass">
                <CardHeader>
                    <CardTitle>Results Table</CardTitle>
                    <CardDescription>Real-time tracking of processed scripts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={submissions}
                        pagination
                        responsive
                        highlightOnHover
                        pointerOnHover
                        customStyles={{
                            headCells: {
                                style: {
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#666',
                                },
                            },
                            cells: {
                                style: {
                                    fontSize: '13px',
                                },
                            },
                        }}
                    />
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Upload & Chat */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Scripts</CardTitle>
                    <CardDescription>Upload PDF batches or images.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                        <Input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                            {file ? file.name : "Select File"}
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">PDF (Multipage) or Images</p>
                    </div>
                    <Button className="w-full" onClick={handleUpload} disabled={!file || uploading}>
                        {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : "Start Processing"}
                    </Button>
                </CardContent>
            </Card>

            {chatOpen && (
                <Card className="fixed bottom-8 right-8 w-80 shadow-2xl animate-in slide-in-from-bottom-10 z-50">
                    <CardHeader className="bg-primary text-primary-foreground rounded-t-xl py-3">
                        <CardTitle className="text-sm flex justify-between items-center">
                            Playbook AI
                            <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)} className="h-6 w-6 p-0 text-white hover:bg-white/20">x</Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-64 flex flex-col">
                        <div className="flex-1 overflow-auto text-sm space-y-2 mb-4">
                            {chatResponse ? (
                                <div className="bg-muted p-2 rounded-lg">{chatResponse}</div>
                            ) : (
                                <p className="text-muted-foreground text-xs text-center">Ask about student performance...</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask query..."
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <Button size="sm" className="h-8 w-8 p-0" onClick={handleChat} disabled={chatLoading}>
                                {chatLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : "→"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
