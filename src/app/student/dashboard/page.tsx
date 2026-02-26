"use client";

import { useEffect, useState } from "react";
import { WorkCodeInput } from "@/components/student/WorkCodeInput";
import { SubmissionList } from "@/components/student/SubmissionList";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/student/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 font-sans text-foreground flex flex-col">
        {/* Minimal Header */}
        <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <span className="text-xl font-bold tracking-tight">Playbook. <span className="text-muted-foreground font-normal ml-1 text-base">Student</span></span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 space-y-20">
            {/* 1. The Magic Gateway */}
            <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pt-10">
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 pb-2">
                        Submit Your Work
                    </h1>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
                        Enter the unique Work Code provided by your lecturer to unlock the submission dropbox.
                    </p>
                </div>

                <WorkCodeInput onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
            </section>

            {/* 2. The Vault */}
            <section>
                <SubmissionList refreshTrigger={refreshTrigger} />
            </section>
        </main>

        <footer className="py-8 text-center text-sm text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Playbook by Uni Monday. All rights reserved.</p>
        </footer>
    </div>
  );
}
