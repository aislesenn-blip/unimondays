"use client";

import { useState } from "react";
import { CodeInput } from "@/components/student/CodeInput";
import { SubmissionDrawer } from "@/components/student/SubmissionDrawer";
import { SubmissionList } from "@/components/student/SubmissionList";

export default function StudentDashboard() {
  const [session, setSession] = useState<any>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCodeSuccess = (sessionData: any) => {
    setSession(sessionData);
    setOpenDrawer(true);
  };

  const handleSubmissionSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      <div className="text-center space-y-6 pt-16">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
          Student Portal
        </h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
          Enter your unique Work Code to submit assignments instantly. No enrollment required.
        </p>
      </div>

      <div className="max-w-lg mx-auto transform hover:scale-105 transition-transform duration-300">
        <CodeInput onSuccess={handleCodeSuccess} />
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-bold tracking-tight">My Submissions</h2>
            <span className="text-sm text-muted-foreground">The Vault</span>
        </div>
        <SubmissionList key={refreshKey} />
      </div>

      <SubmissionDrawer
        session={session}
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        onSuccess={handleSubmissionSuccess}
      />
    </div>
  );
}
