"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSIONS, ANALYTICS } from "@/lib/mock-data";
import { BarChart2, TrendingUp, AlertTriangle, Users } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
        <p className="text-muted-foreground">Deep dive into student performance across all sessions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78.5%</div>
            <p className="text-xs text-muted-foreground text-emerald-600 font-medium">+2.1% from last semester</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Students</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ANALYTICS.studentRiskCount}</div>
            <p className="text-xs text-muted-foreground">Requires intervention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnaround Time</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ANALYTICS.averageTurnaroundTime}</div>
            <p className="text-xs text-muted-foreground">Avg. grading speed</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">294</div>
            <p className="text-xs text-muted-foreground">Across all sessions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Frequency of scores across all assignments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center bg-muted/10 rounded-lg border-2 border-dashed border-muted">
            <div className="text-center">
              <BarChart2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm font-medium">Distribution Chart Placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Difficult Topics</CardTitle>
            <CardDescription>Areas where students struggled most.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { topic: "Recursion (CS 101)", score: "45%", color: "bg-destructive" },
                { topic: "Pointers (CS 202)", score: "52%", color: "bg-orange-500" },
                { topic: "Database Normalization", score: "61%", color: "bg-yellow-500" },
                { topic: "Big O Notation", score: "64%", color: "bg-yellow-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">{item.topic}</p>
                    <div className="w-full bg-secondary h-2 rounded-full mt-2">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: item.score }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold w-12 text-right">{item.score}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
