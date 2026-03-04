import prisma from "@/lib/db/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function WorkSessionDetailsPage({ params }: { params: { id: string } }) {
  const { userId } = auth();

  if (!userId) {
    redirect("/login");
  }

  const session = await prisma.workSession.findUnique({
    where: { id: params.id },
    include: {
      class: true,
      submissions: {
        include: {
          student: true,
          score: true,
        },
        orderBy: { createdAt: "desc" },
      },
      rubric: true,
    },
  });

  if (!session) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{session.title}</h2>
          <p className="text-slate-500">Class: {session.class.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Work Code
          </p>
          <div className="text-2xl font-mono font-bold bg-slate-100 px-4 py-2 rounded-lg inline-block border text-slate-900 tracking-widest shadow-sm">
            {session.workCode}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Submissions</h3>
        {session.submissions.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center bg-white shadow-sm">
            <h3 className="mt-4 text-lg font-semibold">No submissions yet</h3>
            <p className="mb-4 mt-2 text-sm text-slate-500">
              Share the Work Code <strong>{session.workCode}</strong> with your students to receive submissions.
            </p>
          </div>
        ) : (
          <div className="rounded-md border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Email</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.student.email}</TableCell>
                    <TableCell>{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`
                          ${sub.status === "PROCESSING" ? "bg-amber-100 text-amber-700" : ""}
                          ${sub.status === "GRADED" ? "bg-green-100 text-green-700" : ""}
                          ${sub.status === "FAILED" ? "bg-red-100 text-red-700" : ""}
                        `}
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {sub.score ? (
                        <span className="font-bold">{sub.score.totalScore.toFixed(1)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {sub.status === "GRADED" && (
                        <Link
                          href={`/dashboard/submissions/${sub.id}`}
                          className="text-sm text-blue-600 hover:underline font-medium"
                        >
                          View Audit Trail
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
