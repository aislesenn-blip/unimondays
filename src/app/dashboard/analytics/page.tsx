import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, Users, FileCheck } from "lucide-react";

export default async function AnalyticsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'LECTURER') redirect("/login");

  // 1. Fetch Stats
  const activeSessionsCount = await prisma.classes.count({
    where: { lecturerId: user.id, status: 'ACTIVE', deletedAt: null }
  });

  const pendingReviewsCount = await prisma.submission.count({
    where: {
      quiz: { lecturerId: user.id },
      status: { in: ['PENDING', 'FLAGGED', 'PROCESSING'] }
    }
  });

  // 2. Fetch Quiz Performance Data
  const quizzes = await prisma.quiz.findMany({
    where: { lecturerId: user.id, deletedAt: null },
    include: {
      submissions: {
        where: { status: 'GRADED' },
        select: {
          score: { select: { totalMarks: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate Metrics
  const quizMetrics = quizzes.map(q => {
    const scores = q.submissions.map(s => s.score?.totalMarks || 0);
    const total = scores.length;
    if (total === 0) return { id: q.id, title: q.title, avg: 0, passRate: 0, total: 0 };

    const sum = scores.reduce((a, b) => a + b, 0);
    const passed = scores.filter(s => s >= 40).length;

    return {
      id: q.id,
      title: q.title,
      avg: sum / total,
      passRate: (passed / total) * 100,
      total
    };
  });

  // 3. Identify At-Risk Students (Avg < 40 across all quizzes)
  // Fetch all graded submissions for this lecturer
  const allSubmissions = await prisma.submission.findMany({
    where: {
      quiz: { lecturerId: user.id },
      status: 'GRADED',
      score: { isNot: null }
    },
    select: {
      userId: true,
      user: { select: { fullName: true, email: true } },
      score: { select: { totalMarks: true } }
    }
  });

  // Group by Student
  const studentPerformance: Record<string, { name: string, email: string, totalScore: number, count: number }> = {};

  allSubmissions.forEach(sub => {
    if (!sub.userId) return;
    if (!studentPerformance[sub.userId]) {
      studentPerformance[sub.userId] = {
        name: sub.user?.fullName || 'Unknown',
        email: sub.user?.email || 'N/A',
        totalScore: 0,
        count: 0
      };
    }
    studentPerformance[sub.userId].totalScore += sub.score?.totalMarks || 0;
    studentPerformance[sub.userId].count += 1;
  });

  const riskStudents = Object.values(studentPerformance)
    .map(s => ({ ...s, avg: s.totalScore / s.count }))
    .filter(s => s.avg < 40);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics & Insights</h2>
          <p className="text-muted-foreground">Real-time performance metrics for your classes.</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quizMetrics.length > 0
                ? (quizMetrics.reduce((a, b) => a + b.avg, 0) / quizMetrics.length).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quizMetrics.length > 0
                ? (quizMetrics.reduce((a, b) => a + b.passRate, 0) / quizMetrics.length).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Students scoring &ge; 40%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Students</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskStudents.length}</div>
            <p className="text-xs text-muted-foreground">Avg score below 40%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviewsCount}</div>
            <p className="text-xs text-muted-foreground">Submissions awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Performance Table */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Assessment Performance</CardTitle>
            <CardDescription>Breakdown by individual quiz/assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Avg. Score</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizMetrics.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-right">{q.total}</TableCell>
                    <TableCell className="text-right">{q.avg.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={q.passRate} className="w-[60px] h-2" />
                        <span className="text-xs">{q.passRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {q.passRate < 50 ? (
                        <span className="text-destructive text-xs font-bold">Needs Attention</span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-bold">Healthy</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {quizMetrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No data available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* At Risk List */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Students Needing Support</CardTitle>
            <CardDescription>Based on cumulative performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-destructive">{s.avg.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Avg. Score</div>
                  </div>
                </div>
              ))}
              {riskStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                  <FileCheck className="h-8 w-8 mb-2 text-emerald-500 opacity-50" />
                  <p>All students are performing well!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
