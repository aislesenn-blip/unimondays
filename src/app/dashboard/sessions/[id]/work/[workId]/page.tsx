import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkDetailsClient } from "@/components/dashboard/WorkDetailsClient";

export default async function WorkDetailsPage({ params }: { params: Promise<{ id: string, workId: string }> }) {
  const { id, workId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const sessionId = id;
  const quizId = workId;

  const session = await prisma.classes.findUnique({ where: { id: sessionId } });
  if (!session) return <div>Session not found</div>;

  const work = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      _count: { select: { submissions: true } }
    }
  });
  if (!work) return <div>Work not found</div>;

  const submissionsWithUser = await prisma.submission.findMany({
    where: { quizId: quizId },
    include: {
      score: true,
      user: true,
    },
    orderBy: { submittedAt: 'desc' }
  });

  const mappedSubmissions = submissionsWithUser.map((s) => {
    let studentName = s.studentName || "Unknown";
    let regNo = s.studentRegNo || "N/A";

    if (s.user) {
         studentName = s.user.fullName || s.user.email;
         regNo = s.user.email;
    }

    return {
      id: s.id,
      studentId: s.userId || null,
      studentName,
      regNo,
      status: s.status,
      submittedAt: s.submittedAt || new Date(),
      score: s.score?.totalMarks || 0,
      maxScore: work.totalMarks || 100,
      confidence: s.score?.confidence || null,
      filePath: s.filePath
    };
  });

  return (
    <WorkDetailsClient
      sessionId={id}
      workId={workId}
      sessionCode={session.code}
      work={{
        id: work.id,
        title: work.title,
        status: work.status,
        type: "Assignment",
        mode: work.mode,
        submissionsCount: work._count.submissions
      }}
      submissions={mappedSubmissions}
    />
  );
}
