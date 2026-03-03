import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { LiveSubmissionTable } from "@/components/dashboard/LiveSubmissionTable";
import { WorkSessionControls } from "@/components/dashboard/WorkSessionControls";
import { getWorkSessionDetails } from "./actions";
import { getSubmissionsForSession } from "@/app/actions/teacher"; // Corrected import path
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default async function WorkSessionDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const session = await getWorkSessionDetails(params.id);
  if (!session) notFound();
  
  if (session.lecturerId !== user.id && !user.user_metadata.isAdmin) {
      redirect("/dashboard");
  }

  // Fetch submissions using the new server action
  const submissions = await getSubmissionsForSession(params.id);

  // Serialize Date objects to strings for Client Components
  const serializedSession = {
    ...session,
    appealDeadline: session.appealDeadline ? session.appealDeadline.toISOString() : null,
  };

  const serializedSubmissions = submissions.map(s => ({
      ...s,
      submittedAt: s.submittedAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      // Ensure nested objects with dates are also serialized
      user: s.student ? {
          ...s.student,
          createdAt: s.student.createdAt.toISOString(),
          updatedAt: s.student.updatedAt.toISOString(),
      } : null,
      score: s.score ? {
          ...s.score,
          createdAt: s.score.createdAt.toISOString(),
          updatedAt: s.score.updatedAt.toISOString(),
      } : null,
      appeals: s.appeals.map(a => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
      }))
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <Link prefetch={true} href={`/dashboard/classes/${session.classId}`} className="text-sm text-muted-foreground hover:underline">
                    {session.class?.code}
                </Link>
                <span className="text-muted-foreground">/</span>
                <span className="text-sm font-medium">{session.title}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{session.title}</h1>
            <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="font-mono">{session.workCode}</Badge>
                <span className="text-sm text-muted-foreground">
                    {submissions.length} Submissions
                </span>
            </div>
        </div>
        <div className="flex gap-2">
             {session.rubricId && (
                 <a href={`/api/rubrics/${session.rubricId}`} target="_blank" rel="noopener noreferrer">
                     <Button variant="outline">
                         <FileText className="mr-2 h-4 w-4" />
                         View Rubric
                     </Button>
                 </a>
             )}
        </div>
      </div>

      {/* V2.0 Controls */}
      <WorkSessionControls session={serializedSession} />

      <div className="rounded-md border bg-card">
         {/* Live Client Component for "Magic" Updates */}
         <LiveSubmissionTable initialSubmissions={serializedSubmissions} workSession={serializedSession} />
      </div>
    </div>
  );
}
