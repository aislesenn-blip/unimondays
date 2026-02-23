"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, MessageSquare, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface Submission {
  id: number;
  student_reg_no: string;
  student_name: string | null;
  status: string;
  score?: {
    total_marks: number;
    remarks: string;
  };
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/results");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (e) {
      console.error("Failed to fetch results", e);
    }
  };

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
        alert("Upload Successful & Processing Started");
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
        body: JSON.stringify({ query: chatQuery }), // Backend expects query param? No, body.
      });
      // Wait, backend defined: async def chat(query: str, db...)
      // If query is query param, I should append to URL.
      // If body, I need Pydantic model.
      // My backend: async def chat(query: str, ...)
      // FastAPI default for str is query param.
      // So I should POST /api/chat?query=...

      const res2 = await fetch(`/api/chat?query=${encodeURIComponent(chatQuery)}`, {
          method: "POST"
      });

      if (res2.ok) {
        const data = await res2.json();
        setChatResponse(data.response);
      }
    } catch (e) {
      setChatResponse("Error connecting to AI.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Playbook Dashboard</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Lecturer Interface</p>
        </div>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="mr-2 h-4 w-4" /> AI Assistant
        </Button>
      </header>

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Grading</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.filter(s => s.status === 'processing' || s.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
            <Card className="glass">
                <CardHeader>
                    <CardTitle>Recent Submissions</CardTitle>
                    <CardDescription>Real-time tracking of processed scripts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reg No</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell className="font-medium">{sub.student_reg_no}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {sub.status === 'graded' ? <CheckCircle className="h-4 w-4 text-green-500"/> : <Loader2 className="h-4 w-4 animate-spin text-blue-500"/>}
                                            <span className="capitalize">{sub.status}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{sub.score?.total_marks || '-'}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="ghost">View</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {submissions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">No submissions yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

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
