import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { notFound, redirect } from "next/navigation";
import { computeClassAnalytics } from "@/lib/edtech/analytics-engine";

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

  // Delegate heavy CPU-bound parsing to the central Analytics Engine
  const { classHealth, bottlenecks, studentTimeline } = computeClassAnalytics(submissions);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-6 border-b">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">{classData.code}: {classData.name}</p>
         </div>
      </div>

      <AnalyticsDashboard
        classHealth={classHealth}
        bottlenecks={bottlenecks}
        studentTimeline={studentTimeline}
      />
    </div>
  );
}
