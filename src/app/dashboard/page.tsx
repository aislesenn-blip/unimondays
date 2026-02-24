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
import { ANALYTICS, SESSIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your academic sessions and grading performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sessions" className={cn(buttonVariants())}>View Sessions</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/analytics">
          <Card className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scripts Graded</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ANALYTICS.scriptsUsed} / {ANALYTICS.scriptsLimit}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((ANALYTICS.scriptsUsed / ANALYTICS.scriptsLimit) * 100)}% of monthly quota used
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
              <div className="text-2xl font-bold">{ANALYTICS.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                Across 2 semesters
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
              <div className="text-2xl font-bold">{ANALYTICS.pendingReviews}</div>
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
              <div className="text-2xl font-bold">{ANALYTICS.studentRiskCount}</div>
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
            <div className="space-y-8">
              {[
                {
                  user: "Dr. Sarah Manzi",
                  action: "published grades for",
                  target: "Mid-Semester Quiz 1",
                  time: "2 hours ago"
                },
                {
                  user: "System AI",
                  action: "completed grading for",
                  target: "Assignment 1 Batch A",
                  time: "4 hours ago"
                },
                {
                  user: "Dr. Sarah Manzi",
                  action: "created new session",
                  target: "CS 101 - Intro to CS",
                  time: "Yesterday"
                },
                {
                  user: "System AI",
                  action: "flagged 3 submissions in",
                  target: "Final Exam Prep",
                  time: "Yesterday"
                }
              ].map((item, i) => (
                <div key={i} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {item.user} <span className="text-muted-foreground font-normal">{item.action}</span> {item.target}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.time}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
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
              {SESSIONS.slice(0, 3).map((session) => (
                <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer mb-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{session.courseCode}</p>
                      <p className="text-sm text-muted-foreground">{session.courseName}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.studentsCount} Students
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
