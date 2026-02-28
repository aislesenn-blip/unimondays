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
import { LiveSubmissionTable } from "@/components/dashboard/LiveSubmissionTable"; // New Client Component
import { WorkSessionControls } from "@/components/dashboard/WorkSessionControls";

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

  // Determine if marking scheme is a downloadable file
  const markingSchemeUrl = session.markingScheme &&
    (session.markingScheme.startsWith('http') || session.markingScheme.endsWith('.pdf') || session.markingScheme.includes('/'))
    ? session.markingScheme
    : null;

  // FIX: Serialize Date objects to strings for Client Components
  const serializedSession = {
    ...session,
    appealDeadline: session.appealDeadline ? session.appealDeadline.toISOString() : null,
  };

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
                    {session.submissions.length} Submissions
                </span>
            </div>
        </div>
        <div className="flex gap-2">
             {markingSchemeUrl && (
                 <a href={`/api/download?url=${encodeURIComponent(markingSchemeUrl)}`} download>
                     <Button variant="outline">
                         <Download className="mr-2 h-4 w-4" />
                         Marking Scheme
                     </Button>
                 </a>
             )}
             {session.rubricUrl && (
                <a href={`/api/download?url=${encodeURIComponent(session.rubricUrl)}&inline=true`} target="_blank" rel="noopener noreferrer">
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
         <LiveSubmissionTable initialSubmissions={session.submissions} workSession={session} />
      </div>
    </div>
  );
}
