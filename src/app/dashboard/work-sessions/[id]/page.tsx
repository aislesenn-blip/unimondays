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
          score: true
        },
        orderBy: { submittedAt: 'desc' }
      }
    }
  });

  if (!session) notFound();
  if (session.lecturerId !== user.id && user.role !== 'ADMIN') {
      redirect("/dashboard");
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <Link href={`/dashboard/classes/${session.classId}`} className="text-sm text-muted-foreground hover:underline">
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
             {session.rubricUrl && (
                <a href={session.rubricUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        View Rubric
                    </Button>
                </a>
             )}
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {session.submissions.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No submissions yet. Share code <span className="font-mono font-bold text-foreground">{session.workCode}</span> with students.
                    </TableCell>
                </TableRow>
            ) : (
                session.submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{sub.user?.fullName || sub.studentName || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{sub.studentRegNo || sub.user?.email}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={
                            sub.status === 'GRADED' ? 'default' :
                            sub.status === 'FLAGGED' ? 'destructive' :
                            sub.status === 'PROCESSING' ? 'secondary' : 'outline'
                        }>
                            {sub.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        {sub.score ? sub.score.totalMarks : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                        <SubmissionDrawer submission={{...sub, workSession: session}} />
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
