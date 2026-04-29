import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { SubmissionDrawer } from "@/components/dashboard/SubmissionDrawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveSubmissionTable } from "@/components/dashboard/LiveSubmissionTable";
import { WorkSessionControls } from "@/components/dashboard/WorkSessionControls";
import { CopySessionCode } from "@/components/dashboard/CopySessionCode";

export default async function WorkSessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const session = await prisma.workSession.findUnique({
    where: { id },
    include: {
      class: true,
      submissions: {
        include: {
          user: true,
          score: true,
          appeals: true // Include appeals for the client component
        },
        orderBy: { submittedAt: 'desc' }
      }
    }
  });

  if (!session) notFound();
  if (session.lecturerId !== user.id && user.role !== 'ADMIN') {
      redirect("/dashboard");
  }

  // FIX: Serialize Date objects to strings for Client Components
  const serializedSession = {
    ...session,
    appealDeadline: session.appealDeadline ? session.appealDeadline.toISOString() : null,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                {session.title}
                <Badge variant="secondary" className="font-normal text-xs">{session.class?.code}</Badge>
            </h1>
            <div className="flex items-center gap-4 mt-4">
                <CopySessionCode code={session.workCode} />
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
                {session.submissions.length} Submissions
            </div>
        </div>
        <div className="flex flex-col gap-2 items-end pt-2">
             {session.rubricUrl && (
                <a href={`/api/download?url=${encodeURIComponent(session.rubricUrl)}&inline=true`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary">
                        <FileText className="mr-2 h-4 w-4" />
                        View Marking Scheme
                    </Button>
                </a>
             )}
             {session.rubricUrl && (
                 <a href={`/api/download?url=${encodeURIComponent(session.rubricUrl)}`} download>
                     <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                        <Download className="mr-2 h-3 w-3" />
                        Download Scheme
                     </Button>
                 </a>
             )}
        </div>
      </div>

      {/* V2.0 Controls */}
      <WorkSessionControls session={serializedSession} />

      <div className="rounded-md border bg-card">
         {/* Live Client Component for "Magic" Updates */}
         <LiveSubmissionTable initialSubmissions={session.submissions} workSession={session} />
      </div>
    </div>
  );
}
