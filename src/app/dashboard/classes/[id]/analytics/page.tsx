import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { notFound, redirect } from "next/navigation";

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { id } = await params;

  // Fetch Class
  const classData = await prisma.classes.findUnique({
      where: { id },
      include: { workSessions: true }
  });
  if (!classData) notFound();
  if (classData.lecturerId !== user.id && user.role !== 'ADMIN') redirect("/dashboard");

  // Fetch Graded Submissions (Expanded Scope)
  const submissions = await prisma.submission.findMany({
      where: {
          workSession: { classId: id },
          status: { in: ['GRADED', 'FLAGGED', 'RELEASED', 'APPEALED'] }
      },
      include: {
          score: true,
          workSession: true,
          user: true
      },
      orderBy: { submittedAt: 'asc' }
  });

  // 1. Class Health
  let totalScoreSum = 0;
  let highest = 0;
  let lowest = 100; // Percentage
  let passCount = 0;
  let totalCount = 0;

  // 2. Bottlenecks
  const questionStats: Record<string, { failures: number; count: number; totalScore: number; maxScore: number }> = {};

  // 3. Student Timeline
  const studentMap: Record<string, { name: string; data: any[] }> = {};

  submissions.forEach(sub => {
      if (!sub.score) return;

      const max = sub.workSession.totalMarks || 100;
      const score = sub.score.totalMarks;
      const percentage = max > 0 ? (score / max) * 100 : 0;

      // Health
      totalScoreSum += percentage; // Average of percentages
      totalCount++;
      if (percentage > highest) highest = percentage;
      if (percentage < lowest) lowest = percentage;
      if (percentage >= 50) passCount++;

      // Timeline
      // Priority: Detected > User > StudentName
      const studentName = sub.score.detectedIdentity || sub.user?.fullName || sub.studentName || "Unknown";
      const key = sub.userId || studentName; // Fallback to name if no UserID

      if (!studentMap[key]) {
          studentMap[key] = { name: studentName, data: [] };
      }
      studentMap[key].data.push({
          session: sub.workSession.title,
          score: Math.round(percentage), // normalized to 100
          date: sub.submittedAt?.toISOString() || new Date().toISOString()
      });

      // Bottlenecks
      try {
          const breakdown = JSON.parse(sub.score.breakdown);
          if (Array.isArray(breakdown)) {
              breakdown.forEach((q: any) => {
                  // Key by Session Title + Question to avoid collisions
                  const qName = `${sub.workSession.title}: ${q.question || "Q"}`;

                  if (!questionStats[qName]) questionStats[qName] = { failures: 0, count: 0, totalScore: 0, maxScore: q.max || 10 };

                  questionStats[qName].count++;
                  questionStats[qName].totalScore += q.score || 0;

                  // Assume failure if score < 50% of max
                  if (q.score < (q.max * 0.5)) {
                      questionStats[qName].failures++;
                  }
              });
          }
      } catch (e) {}
  });

  const average = totalCount > 0 ? totalScoreSum / totalCount : 0;
  const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 0;
  if (totalCount === 0) lowest = 0;

  const bottlenecks = Object.entries(questionStats)
      .map(([q, stats]) => {
          const avg = stats.count > 0 ? (stats.totalScore / stats.count) : 0;
          return {
            question: q,
            failureRate: Math.round((stats.failures / stats.count) * 100),
            avgScore: parseFloat(avg.toFixed(1)),
            maxScore: stats.maxScore
          };
      })
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5); // Top 5

  const studentTimeline = Object.values(studentMap).map(s => ({
      studentName: s.name,
      data: s.data
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-6 border-b">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">{classData.code}: {classData.name}</p>
         </div>
      </div>

      <AnalyticsDashboard
        classHealth={{
            average: parseFloat(average.toFixed(1)),
            highest: Math.round(highest),
            lowest: Math.round(lowest),
            passRate: parseFloat(passRate.toFixed(1)),
            totalStudents: studentTimeline.length
        }}
        bottlenecks={bottlenecks}
        studentTimeline={studentTimeline}
      />
    </div>
  );
}
