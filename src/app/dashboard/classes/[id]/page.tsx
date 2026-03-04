import prisma from "@/lib/db/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ClassDetailsPage({ params }: { params: { id: string } }) {
  const { userId } = auth();

  if (!userId) {
    redirect("/login");
  }

  const classData = await prisma.class.findUnique({
    where: { id: params.id, lecturerId: userId },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      },
    },
  });

  if (!classData) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{classData.name}</h2>
          <p className="text-slate-500">Class Code: {classData.code}</p>
        </div>
        <Link href={`/dashboard/classes/${classData.id}/work-sessions/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Work Session
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Work Sessions</h3>
        {classData.sessions.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center bg-white shadow-sm">
            <h3 className="mt-4 text-lg font-semibold">No work sessions yet</h3>
            <p className="mb-4 mt-2 text-sm text-slate-500">
              Create a new work session by uploading a grading rubric.
            </p>
            <Link href={`/dashboard/classes/${classData.id}/work-sessions/new`}>
              <Button size="sm">Create Session</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classData.sessions.map((session) => (
              <Link key={session.id} href={`/dashboard/work-sessions/${session.id}`}>
                <Card className="hover:bg-slate-50 hover:shadow-sm transition-all shadow-none h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <CardDescription>Code: {session.workCode}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-slate-500">
                       <span>{session._count.submissions} Submissions</span>
                       <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs">Active</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
