"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserPlus,
  ArrowRight,
  GitMerge,
  Cpu,
  Layers,
  DatabaseZap,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  status: string; // 'PENDING' | 'SLICING' | 'INJECTING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED'
  processedFiles: number;
  totalFiles: number;
  unidentifiedCount: number;
  errorMessage?: string;
  submissions: any[];
}

export default function CloudMarkingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [session, setSession] = useState<BulkSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Poll for status updates
  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    const fetchStatus = async () => {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/cloud-marking/${resolvedParams.id}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setSession(data);

          if (['READY', 'COMPLETED', 'FAILED'].includes(data.status)) {
             setLoading(false);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    // Initial fetch
    fetchStatus();
    // Start polling
    interval = setInterval(fetchStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [params]);

  // Derived Progress & States
  const isSlicing = session?.status === 'PENDING' || session?.status === 'SLICING';
  const isInjecting = session?.status === 'INJECTING';
  const isProcessing = session?.status === 'PROCESSING' || session?.status === 'READY';

  const slicingProgress = session?.totalFiles ? (session.processedFiles / session.totalFiles) * 100 : 0;
  const gradingProgress = session?.submissions?.length
      ? (session.submissions.filter((s: any) => ['GRADED', 'FLAGGED', 'FAILED'].includes(s.status)).length / session.submissions.length) * 100
      : 0;
  const isGradingComplete = session?.submissions?.length
      ? session.submissions.every((s: any) => ['GRADED', 'FLAGGED', 'FAILED'].includes(s.status))
      : false;

  const handleCreateNewClass = async () => {
      if (!session) return;
      setSyncing(true);
      try {
          const res = await fetch(`/api/cloud-marking/${session.id}/convert`, { method: 'POST' });
          if (!res.ok) throw new Error((await res.json()).error || "Conversion failed");

          const data = await res.json();
          toast.success("Converted to Class successfully!");
          router.push(`/dashboard/classes/${data.classId}`);
      } catch (error: any) {
          toast.error(error.message);
      } finally {
          setSyncing(false);
      }
  };

  if (!session) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium animate-pulse">Establishing Link</p>
        </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border/50 pb-8 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-4">
             <Badge
                variant="outline"
                className={`uppercase tracking-widest text-[10px] font-bold px-3 py-1 rounded-full ${
                    session.status === 'FAILED' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
                    session.status === 'COMPLETED' || session.status === 'READY' ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' :
                    'border-primary/50 text-primary bg-primary/10'
                }`}
             >
                {session.status === 'PROCESSING' && <Loader2 className="mr-2 h-3 w-3 animate-spin inline" />}
                {session.status}
             </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{session.title}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
             <Layers className="h-4 w-4" /> Massive Payload Session
          </p>
        </div>

        <div className="flex items-center gap-4">
           {(session.status === 'READY' || session.status === 'COMPLETED') && (
               <>
                   <Button variant="ghost" onClick={() => router.push('/dashboard/cloud-marking')} className="text-muted-foreground hover:text-foreground">
                        Dismiss
                   </Button>
                   <Button
                        onClick={handleCreateNewClass}
                        disabled={syncing || !isGradingComplete}
                        className={`bg-foreground text-background hover:bg-foreground/90 transition-all ${!isGradingComplete ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitMerge className="mr-2 h-4 w-4" />}
                        Commit to System
                   </Button>
               </>
           )}
        </div>
      </div>

      {/* FAILED STATE */}
      {session.status === 'FAILED' && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Process Terminated</h3>
              <p className="text-sm text-muted-foreground max-w-lg">
                  {session.errorMessage || "A fatal error occurred during the slicing or ingestion phase. Please check the massive PDF format and retry."}
              </p>
              <Button variant="outline" className="mt-4 border-red-500/20 text-red-600 hover:bg-red-500/10" onClick={() => router.push('/dashboard/cloud-marking')}>
                  Acknowledge & Return
              </Button>
          </div>
      )}

      {/* FIRE AND FORGET ASYNC STATE UI */}
      {(!['READY', 'COMPLETED', 'FAILED'].includes(session.status)) ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-12">

              <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full" />
                  <div className="h-24 w-24 bg-background border border-border/50 rounded-3xl flex items-center justify-center relative shadow-2xl">
                      <Cpu className="h-10 w-10 text-primary animate-pulse" />
                  </div>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                      {isSlicing ? "Slicing Massive Payload..." :
                       isInjecting ? "Injecting into Queue..." :
                       "Grading Engine Active..."}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      This is a "fire and forget" background operation. You may safely close this tab or navigate away. The system is autonomously processing the data.
                  </p>
              </div>

              {/* Minimalist Progress Indicators */}
              <div className="w-full max-w-lg space-y-8 bg-muted/20 p-8 rounded-2xl border border-border/50">
                  {/* Step 1: Slicing */}
                  <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                          <span className={isSlicing ? "text-foreground" : "text-muted-foreground"}>
                              1. AI Heuristic Slicing
                          </span>
                          <span className="text-muted-foreground font-mono">
                              {session.totalFiles > 0 ? `${session.processedFiles}/${session.totalFiles}` : "Initializing..."}
                          </span>
                      </div>
                      <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden">
                          <div
                              className={`h-full transition-all duration-700 ease-out ${!isSlicing ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${session.totalFiles > 0 ? slicingProgress : (isSlicing ? 5 : 100)}%` }}
                          />
                      </div>
                  </div>

                  {/* Step 2: Queue Injection */}
                  <div className={`space-y-3 transition-opacity duration-500 ${isSlicing ? "opacity-30" : "opacity-100"}`}>
                      <div className="flex justify-between text-sm font-medium">
                          <span className={isInjecting ? "text-foreground" : "text-muted-foreground"}>
                              2. Queue Database Injection
                          </span>
                          <span className="text-muted-foreground">
                              {isInjecting ? <Loader2 className="h-3 w-3 animate-spin inline" /> : (!isSlicing && <Check className="h-4 w-4 text-emerald-500 inline" />)}
                          </span>
                      </div>
                      <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden">
                          <div
                              className={`h-full transition-all duration-700 ease-out ${isProcessing || session.status === 'READY' ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${isProcessing || session.status === 'READY' ? 100 : (isInjecting ? 50 : 0)}%` }}
                          />
                      </div>
                  </div>

                  {/* Step 3: Grading */}
                  <div className={`space-y-3 transition-opacity duration-500 ${isSlicing || isInjecting ? "opacity-30" : "opacity-100"}`}>
                      <div className="flex justify-between text-sm font-medium">
                          <span className={isProcessing ? "text-foreground" : "text-muted-foreground"}>
                              3. DeepSeek Map-Reduce Engine
                          </span>
                          <span className="text-muted-foreground font-mono">
                              {Math.round(gradingProgress)}%
                          </span>
                      </div>
                      <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden">
                          <div
                              className="h-full bg-primary transition-all duration-700 ease-out"
                              style={{ width: `${gradingProgress}%` }}
                          />
                      </div>
                  </div>
              </div>
          </div>
      ) : session.status === 'FAILED' ? null : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">

              <div className="grid gap-6 md:grid-cols-2">
                  {/* METRIC CARDS */}
                  <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 flex items-center justify-between">
                      <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valid Extractions</p>
                          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                              {session.submissions?.filter((s: any) => s.userId || s.studentRegNo)?.length || 0}
                          </p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="h-6 w-6" />
                      </div>
                  </div>

                  <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-6 flex items-center justify-between">
                      <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Unidentified IDs</p>
                          <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                              {session.submissions?.filter((s: any) => !s.userId && !s.studentRegNo)?.length || 0}
                          </p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <Users className="h-6 w-6" />
                      </div>
                  </div>
              </div>

              {/* LUXURY DATA TABLE */}
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
                  <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/10">
                      <h3 className="text-lg font-semibold text-foreground">Extracted Records</h3>
                      <Badge variant="outline" className="font-mono text-xs border-primary/20 bg-primary/5 text-primary">
                          {session.submissions?.length || 0} TOTAL
                      </Badge>
                  </div>
                  <div className="p-0">
                      <Table>
                          <TableHeader className="bg-muted/30">
                              <TableRow className="hover:bg-transparent border-border/50">
                                  <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Identity Marker</TableHead>
                                  <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Engine Status</TableHead>
                                  <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 text-right">Awarded</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {session.submissions?.map((sub: any) => (
                                  <TableRow key={sub.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                                      <TableCell className="py-4">
                                          <div className="flex flex-col space-y-1">
                                              <span className="font-medium text-sm text-foreground">
                                                  {sub.studentName || sub.studentRegNo || sub.score?.detectedIdentity || <span className="text-amber-500/80 italic">Unidentified Document</span>}
                                              </span>
                                              {(sub.studentName || sub.score?.detectedIdentity) && sub.studentRegNo && (
                                                  <span className="text-xs text-muted-foreground font-mono">{sub.studentRegNo}</span>
                                              )}
                                          </div>
                                      </TableCell>
                                      <TableCell className="py-4">
                                          <Badge
                                              variant="outline"
                                              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                                                  sub.status === 'GRADED' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' :
                                                  sub.status === 'FLAGGED' ? 'border-red-500/30 text-red-500 bg-red-500/5' :
                                                  'border-border text-muted-foreground'
                                              }`}
                                          >
                                              {sub.status}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="py-4 text-right font-mono text-sm">
                                          {sub.score?.totalMarks !== undefined ? sub.score.totalMarks : <span className="text-muted-foreground/30">-</span>}
                                      </TableCell>
                                  </TableRow>
                              ))}
                              {(!session.submissions || session.submissions.length === 0) && (
                                  <TableRow>
                                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-sm">
                                          No records generated yet.
                                      </TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
