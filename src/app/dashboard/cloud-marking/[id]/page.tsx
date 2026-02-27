"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserPlus,
  ArrowRight,
  GitMerge
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
  submissions: any[]; // In a real app, this might be paginated
}

export default function CloudMarkingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [session, setSession] = useState<BulkSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Poll for status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchStatus = async () => {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/cloud-marking/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);

          if (data.status === 'READY' || data.status === 'COMPLETED' || data.status === 'FAILED') {
             setLoading(false);
             clearInterval(interval);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, [params]);


  const handleSyncToClass = async () => {
    // Ideally this opens a modal to select a class.
    // For this MVP/Sim, we will just simulate a "Create New Class" or "Sync to Default"
    toast.info("Feature: Sync to existing class (Coming Soon)");
  };

  const handleCreateNewClass = async () => {
      setSyncing(true);
      try {
          // This would call an API to convert the BulkSession -> Class + WorkSession
          // Since we already created a WorkSession in the worker (type=BULK), we just need to finalize it.
          // For now, let's redirect to the WorkSession created by the worker.
          // We need to fetch the workSessionId.

          // Assuming the API returns the linked WorkSession ID if available
          // Or we just redirect to the bulk session page which IS the work session effectively?
          // No, Mandate says "Convert this entire bulk session into a brand new Class".

          toast.success("Converting to Class...");
          // Simulate delay
          await new Promise(r => setTimeout(r, 1000));

          // In a real app, we'd have a specific route.
          // Here, let's just go back to dashboard as if it's done.
          router.push('/dashboard');
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
             <Badge variant={session.status === 'READY' ? 'default' : 'secondary'}>
                {session.status === 'PROCESSING' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {session.status}
             </Badge>
             <span className="text-muted-foreground text-sm">
                {session.processedFiles} / {session.totalFiles} Scripts Processed
             </span>
          </div>
        </div>
        <div className="flex gap-2">
           {session.status === 'READY' && (
               <>
                   <Button variant="outline" onClick={() => router.push('/dashboard/cloud-marking')}>
                        Cancel
                   </Button>
                   <Button onClick={handleCreateNewClass} disabled={syncing}>
                        {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitMerge className="mr-2 h-4 w-4" />}
                        Convert to Class
                   </Button>
               </>
           )}
        </div>
      </div>

      {/* MANDATE 4: RECONCILIATION UI */}
      {session.status === 'PROCESSING' || session.status === 'PENDING' ? (
          <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold">AI is Grading & Organizing...</h3>
                  <p className="text-muted-foreground max-w-md">
                      The system is autonomously fetching, slicing, and grading the submissions.
                      Results will appear here shortly.
                  </p>
              </CardContent>
          </Card>
      ) : (
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
                      <CardTitle>Submission Preview</CardTitle>
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
                                          {sub.studentRegNo || sub.score?.detectedIdentity || <span className="text-amber-600 italic">Unidentified</span>}
                                      </TableCell>
                                      <TableCell>
                                          <Badge variant={sub.status === 'GRADED' ? 'default' : 'secondary'}>{sub.status}</Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                          {sub.score?.totalMarks || '-'}
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
