"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Users, Activity, AlertTriangle } from "lucide-react";

interface QuestionStat {
  question: string;
  failureRate: number; // percentage
  avgScore: number;
  maxScore: number;
}

interface StudentProgress {
  studentName: string;
  data: { session: string; score: number; date: string }[];
}

interface AnalyticsDashboardProps {
  classHealth: {
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
    totalStudents: number;
  };
  bottlenecks: QuestionStat[]; // Top 5 hardest questions
  studentTimeline: StudentProgress[]; // Data for all students
}

export function AnalyticsDashboard({ classHealth, bottlenecks, studentTimeline }: AnalyticsDashboardProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>(studentTimeline[0]?.studentName || "");

  const currentStudentData = studentTimeline.find(s => s.studentName === selectedStudent)?.data || [];

  return (
    <div className="space-y-8">

      {/* Metric B: Class Health Pulse */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Class Avg</CardTitle>
            <Activity className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{classHealth.average.toFixed(1)}%</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Overall</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Pass Rate</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{classHealth.passRate.toFixed(1)}%</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">&gt;50% Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Highest</CardTitle>
            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{classHealth.highest}%</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Top Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Lowest</CardTitle>
            <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{classHealth.lowest}%</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Min Score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">

        {/* Metric A: Bottleneck Finder */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Bottleneck Finder</CardTitle>
            <CardDescription>
              Questions with the highest failure rates across all assessments.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={bottlenecks}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="question" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="failureRate" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failure Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Metric C: Student CA Profile */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>
              Track individual performance over time.
            </CardDescription>
            <div className="pt-2">
                <Select value={selectedStudent} onChange={(e: any) => setSelectedStudent(e.target.value)}>
                    {studentTimeline.map(s => (
                        <option key={s.studentName} value={s.studentName}>
                            {s.studentName}
                        </option>
                    ))}
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            {currentStudentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={currentStudentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="session" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip />
                    <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Select a student to view progress.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
