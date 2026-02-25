import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GradeViewClient } from "@/components/dashboard/GradeViewClient";

export default async function GradePage({ params }: { params: Promise<{ id: string, workId: string, submissionId: string }> }) {
  const { id, workId, submissionId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const subId = parseInt(submissionId);
  const quizId = parseInt(workId);

  if (isNaN(subId) || isNaN(quizId)) return <div>Invalid IDs</div>;

  const submission = await prisma.submission.findUnique({
    where: { id: subId },
    include: {
      score: true,
      user: true,
      quiz: true
    }
  });

  if (!submission) return <div>Submission not found</div>;
  if (submission.quizId !== quizId) return <div>Submission mismatch</div>;

  // Access check
  if (user.role.toUpperCase() === 'LECTURER' && submission.quiz.lecturerId !== user.id) {
    return <div>Forbidden</div>;
  }

  // Parse breakdown
  let breakdown = [];
  try {
    if (submission.score?.breakdown) {
      breakdown = JSON.parse(submission.score.breakdown);
    }
  } catch (e) {}

  return (
    <GradeViewClient
      sessionId={id}
      workId={workId}
      submission={{
        id: submission.id,
        studentName: submission.user?.fullName || submission.studentName || "Unknown",
        regNo: submission.user?.email || submission.studentRegNo || "N/A",
        score: submission.score?.totalMarks || 0,
        maxScore: submission.quiz.totalMarks || 100,
        aiReasoning: submission.score?.remarks || "",
        confidence: submission.score?.confidence || 0,
        fileUrl: submission.filePath,
        ocrText: submission.ocrText,
        breakdown
      }}
    />
  );
}
