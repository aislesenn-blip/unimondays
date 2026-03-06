"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2,
    Search,
    FileText,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";

export default function StudentMagicPortal({ params }: { params: Promise<{ session_id: string }> }) {
    const router = useRouter();
    // Verification State
    const [regNo, setRegNo] = useState("");
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState<any>(null);

    // Auth State (PLG Hook)
    const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('SIGNUP');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regNo.trim()) {
            toast.error("Please enter your Registration Number.");
            return;
        }

        setLoading(true);
        try {
            const resolvedParams = await params;
            // Execute the Verification API
            const res = await fetch(`/api/results/${resolvedParams.session_id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationNumber: regNo.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to find academic results.");
            }

            setResultData(data);
            toast.success("Identity verified securely.");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthAndClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || (authMode === 'SIGNUP' && !fullName)) {
            toast.error("Please fill in all standard required fields.");
            return;
        }

        setAuthLoading(true);
        try {
            // 1. Authenticate using existing internal system routes
            const endpoint = authMode === 'SIGNUP' ? '/api/auth/student/signup' : '/api/auth/login';
            const authPayload = authMode === 'SIGNUP' ? { email, password, fullName } : { email, password };

            const authRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authPayload)
            });

            if (!authRes.ok) {
                const err = await authRes.json();
                throw new Error(err.error || "Authentication procedure failed.");
            }

            // 2. Execute the Claim API (Permanent Link to Account)
            const resolvedParams = await params;
            const claimRes = await fetch(`/api/results/${resolvedParams.session_id}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: resultData.id })
            });

            if (!claimRes.ok) {
                 const err = await claimRes.json();
                 throw new Error(err.error || "Failed to link result to your academic account.");
            }

            toast.success("Account created and results permanently saved!");

            // 3. The Redirect to their Standard Hub
            router.push('/student');

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleViewPdf = () => {
        if (!resultData?.filePath) return;
        const encodedPath = encodeURIComponent(resultData.filePath);
        window.open(`/api/download?path=${encodedPath}`, '_blank');
    };

    // STEP 1: THE GATE (Minimalist Mobile-First Verification)
    if (!resultData) {
        return (
            <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <div className="h-16 w-16 bg-foreground text-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Lock className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Secure Results</h1>
                        <p className="text-muted-foreground text-sm px-4 leading-relaxed">
                            Enter your Registration Number below to access your academic results.
                        </p>
                    </div>

                    <Card className="border-border/50 shadow-2xl shadow-black/5 bg-card/50 backdrop-blur-xl rounded-2xl overflow-hidden">
                        <CardContent className="p-6 sm:p-8">
                            <form onSubmit={handleVerify} className="space-y-6">
                                <div className="space-y-3">
                                    <Label htmlFor="regNo" className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Registration Number</Label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="regNo"
                                            type="text"
                                            placeholder="e.g. 1045091"
                                            className="pl-12 h-14 text-lg bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-foreground rounded-xl transition-all font-mono"
                                            value={regNo}
                                            onChange={(e) => setRegNo(e.target.value)}
                                            autoComplete="off"
                                            autoCorrect="off"
                                            spellCheck="false"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-14 text-base font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-all"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Access Results"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                        <ShieldCheck className="h-4 w-4" /> Secure Academic Verification
                    </div>
                </div>
            </div>
        );
    }

    // STEP 2 & 3: THE REVEAL & THE PLG HOOK
    return (
        <div className="min-h-[100dvh] bg-background pb-24 animate-in slide-in-from-bottom-8 duration-700">
            {/* Header Sticky */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 sm:px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">{resultData.workSessionTitle}</h1>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{regNo.toUpperCase()}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 font-semibold">
                        Verified
                    </Badge>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 space-y-10">
                {/* Score Hero (Apple/Uber-Black Styling) */}
                <section className="text-center space-y-6">
                    <div className="inline-flex flex-col items-center justify-center w-40 h-40 sm:w-48 sm:h-48 rounded-full border-[6px] border-foreground/5 bg-background shadow-2xl shadow-foreground/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent"></div>
                        <span className="text-5xl sm:text-6xl font-bold tracking-tighter text-foreground relative z-10">
                            {resultData.totalMarks}
                        </span>
                        <div className="w-12 h-0.5 bg-border/50 my-2 relative z-10"></div>
                        <span className="text-sm sm:text-base text-muted-foreground font-medium relative z-10">
                            out of {resultData.maxMarks}
                        </span>
                    </div>

                    <Button
                        onClick={handleViewPdf}
                        variant="outline"
                        className="h-12 px-6 rounded-full border-border/50 hover:bg-muted/50 transition-all font-medium"
                    >
                        <FileText className="mr-2 h-4 w-4" /> View Original Script
                    </Button>
                </section>

                {/* Feedback Breakdown (Progressive Disclosure) */}
                <section className="space-y-4">
                    <h2 className="text-sm uppercase tracking-widest font-semibold text-muted-foreground px-1">Detailed Breakdown</h2>
                    <Accordion type="single" collapsible className="w-full space-y-3">
                        {resultData.breakdown?.map((item: any, idx: number) => (
                            <AccordionItem key={idx} value={`item-${idx}`} className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-sm">
                                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors data-[state=open]:bg-muted/30">
                                    <div className="flex items-center justify-between w-full pr-4 gap-4">
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-semibold text-sm sm:text-base line-clamp-2">
                                                {item.mappedRubricQuestion || `Question ${idx + 1}`}
                                            </span>
                                            {item.evidenceSnippet && (
                                                <span className="text-xs text-muted-foreground line-clamp-1 mt-1 opacity-70">
                                                    "{item.evidenceSnippet}"
                                                </span>
                                            )}
                                        </div>
                                        <Badge variant="secondary" className="font-mono font-bold bg-foreground/5 text-foreground whitespace-nowrap">
                                            {item.score} pts
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-5 py-4 bg-muted/10 border-t border-border/50 space-y-4">
                                    {item.feedback && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Evaluation</p>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {item.feedback}
                                            </p>
                                        </div>
                                    )}
                                    {item.evidenceSnippet && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Found in script</p>
                                            <blockquote className="border-l-2 border-foreground/20 pl-3 py-1 italic text-sm text-muted-foreground/80 bg-background rounded-r-md">
                                                {item.evidenceSnippet}
                                            </blockquote>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                        {(!resultData.breakdown || resultData.breakdown.length === 0) && (
                            <div className="p-8 text-center border border-border/50 rounded-2xl bg-card text-muted-foreground text-sm">
                                No granular feedback available for this submission.
                            </div>
                        )}
                    </Accordion>
                </section>

                {/* THE PLG HOOK (Account Claiming Form) */}
                {!resultData.isClaimed && (
                    <section className="pt-8 pb-12">
                        <Card className="border-border shadow-2xl shadow-foreground/5 bg-foreground text-background overflow-hidden relative">
                            {/* Decorative minimalist element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>

                            <CardHeader className="relative z-10 pb-4">
                                <CardTitle className="text-2xl font-semibold">Save your results.</CardTitle>
                                <CardDescription className="text-background/70 text-base leading-relaxed">
                                    Create an account or Log in to save these results permanently and track your academic progress.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10 pt-2">
                                <form onSubmit={handleAuthAndClaim} className="space-y-4">
                                    {authMode === 'SIGNUP' && (
                                        <div className="space-y-2">
                                            <Input
                                                type="text"
                                                placeholder="Full Name"
                                                className="bg-background/10 border-background/20 text-background placeholder:text-background/40 h-12 rounded-xl focus-visible:ring-background/50"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Input
                                            type="email"
                                            placeholder="University Email"
                                            className="bg-background/10 border-background/20 text-background placeholder:text-background/40 h-12 rounded-xl focus-visible:ring-background/50"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            type="password"
                                            placeholder="Password"
                                            className="bg-background/10 border-background/20 text-background placeholder:text-background/40 h-12 rounded-xl focus-visible:ring-background/50"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-base font-semibold bg-background text-foreground hover:bg-background/90 rounded-xl transition-all mt-2"
                                        disabled={authLoading}
                                    >
                                        {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                            <>
                                                {authMode === 'SIGNUP' ? 'Create Account & Save' : 'Log In & Save'}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>

                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode(authMode === 'SIGNUP' ? 'LOGIN' : 'SIGNUP')}
                                            className="text-sm text-background/70 hover:text-background transition-colors underline underline-offset-4"
                                        >
                                            {authMode === 'SIGNUP' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </section>
                )}

                {/* State if already claimed by an account */}
                {resultData.isClaimed && (
                    <section className="pt-4 pb-8 text-center">
                        <div className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border/50">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> This result is saved to an account.
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
