"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Users, Activity } from "lucide-react";

// Assuming these types are defined elsewhere, but including for context
interface QuestionStat {
  question: string;
  failureRate: number;
}
interface StudentProgress {
  studentName: string;
  data: { session: string; score: number; date: string }[];
}
interface AnalyticsDashboardProps {
  classHealth: { average: number; passRate: number; highest: number; lowest: number; };
  bottlenecks: QuestionStat[];
  studentTimeline: StudentProgress[];
}

// A small, reusable component for stat cards
function StatCard({ title, value, icon: Icon, note, valueColor }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard({ classHealth, bottlenecks, studentTimeline }: AnalyticsDashboardProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>(studentTimeline[0]?.studentName || "");

  const currentStudentData = studentTimeline.find(s => s.studentName === selectedStudent)?.data || [];

  return (
    <div className="space-y-6">

      {/* 1. Class Health Pulse - Cleaner Layout */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Class Average" value={`${classHealth.average.toFixed(1)}%`} icon={Activity} note="Overall performance" />
        <StatCard title="Pass Rate" value={`${classHealth.passRate.toFixed(1)}%`} icon={Users} note="Scored above 50%" />
        <StatCard title="Highest Score" value={`${classHealth.highest}%`} icon={ArrowUpRight} note="Top individual score" valueColor="text-success" />
        <StatCard title="Lowest Score" value={`${classHealth.lowest}%`} icon={ArrowDownRight} note="Lowest individual score" valueColor="text-destructive" />
      </div>

      {/* 2. Main Grid - Switched to a more balanced 5-col layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Bottleneck Finder - Themed Chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Bottleneck Finder</CardTitle>
            <CardDescription>Questions with the highest failure rates across all assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={bottlenecks} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="question" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                />
                <Bar dataKey="failureRate" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Failure Rate" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Student Progress - Using proper Select component */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>Track individual performance over time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {studentTimeline.map(s => (
                  <SelectItem key={s.studentName} value={s.studentName}>
                    {s.studentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <ResponsiveContainer width="100%" height={300}>
              {currentStudentData.length > 0 ? (
                <LineChart data={currentStudentData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="session" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No data available for this student.
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper for conditional classnames
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
