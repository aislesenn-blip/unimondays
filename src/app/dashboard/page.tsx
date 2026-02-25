import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  FileText,
  Activity,
  AlertCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  // Fetch Data
  const activeSessionsCount = await prisma.classes.count({
    where: { lecturerId: user.id, status: "ACTIVE", deletedAt: null }
  });

  const pendingReviewsCount = await prisma.submission.count({
    where: {
      quiz: { lecturerId: user.id },
      status: { in: ["SUBMITTED", "FLAGGED", "PROCESSING"] }
    }
  });

  // Risk count: Mock logic for now (e.g., scores < 40%)
  // Real logic would require aggregation which is complex.
  const studentRiskCount = 0;

  const recentSessions = await prisma.classes.findMany({
    where: { lecturerId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      _count: {
        select: { enrollments: true }
      }
    }
  });

  // Recent Activity: Fetch from AuditLog or Submissions
  const recentActivity = await prisma.auditLog.findMany({
    where: { submission: { quiz: { lecturerId: user.id } } },
    orderBy: { timestamp: "desc" },
    take: 4,
    include: {
      submission: {
        include: {
          quiz: true,
          // student info?
        }
      }
    }
  });

  // If no audit logs, show empty or welcome message
  const hasActivity = recentActivity.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your academic sessions and grading performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sessions/create" className={cn(buttonVariants())}>Create Session</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/analytics">
          <Card className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scripts Processed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.used}</div>
              <p className="text-xs text-muted-foreground">
                Lifetime usage ({user.used}/{user.quota})
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessionsCount}</div>
              <p className="text-xs text-muted-foreground">
                Current Semester
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sessions?filter=pending">
          <Card className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReviewsCount}</div>
              <p className="text-xs text-muted-foreground">
                Requires manual attention
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics?view=risk">
          <Card className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk Students</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentRiskCount}</div>
              <p className="text-xs text-muted-foreground">
                Scored below 40% average
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest grading actions and session updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasActivity ? (
              <div className="space-y-8">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {log.action} <span className="text-muted-foreground font-normal">
                          {log.submission?.quiz?.title ? `on ${log.submission.quiz.title}` : ''}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p>No recent activity.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Quick access to your ongoing courses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSessions.length > 0 ? recentSessions.map((session) => (
                <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer mb-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{session.code}</p>
                      <p className="text-sm text-muted-foreground">{session.name}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session._count.enrollments} Students
                    </div>
                  </div>
                </Link>
              )) : (
                 <div className="text-center py-4 text-muted-foreground">
                   No active sessions.
                 </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
