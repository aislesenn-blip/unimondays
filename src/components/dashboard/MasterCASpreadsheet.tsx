"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface WorkSession {
  id: string;
  title: string;
  totalMarks: number;
  includeInCalculation: boolean;
}

interface ScoreData {
  workSessionId: string;
  score: number;
}

interface StudentRow {
  id: string; // User ID or unique key
  name: string;
  regNo: string;
  scores: Record<string, number>; // workSessionId -> score
}

interface MasterCASpreadsheetProps {
  workSessions: WorkSession[];
  students: StudentRow[];
  classId: string;
}

export function MasterCASpreadsheet({ workSessions: initialSessions, students, classId }: MasterCASpreadsheetProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle "Include in Final"
  const toggleInclude = async (sessionId: string, currentVal: boolean) => {
    // Optimistic update
    const newSessions = sessions.map(s => s.id === sessionId ? { ...s, includeInCalculation: !currentVal } : s);
    setSessions(newSessions);

    try {
      const res = await fetch(`/api/work-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeInCalculation: !currentVal })
      });
      if (!res.ok) throw new Error("Update failed");
    } catch (e) {
      toast.error("Failed to update calculation setting");
      // Revert
      setSessions(sessions);
    }
  };

  // Calculate Totals
  const processedStudents = useMemo(() => {
    return students.map(student => {
      let totalScore = 0;
      let possibleMax = 0; // Total possible marks based on included sessions

      sessions.forEach(session => {
        if (session.includeInCalculation) {
          const score = student.scores[session.id] || 0;
          totalScore += score;
          possibleMax += (session.totalMarks || 100);
        }
      });

      const percentage = possibleMax > 0 ? (totalScore / possibleMax) * 100 : 0;

      return {
        ...student,
        totalScore,
        percentage
      };
    }).sort((a, b) => b.percentage - a.percentage); // Rank by percentage
  }, [students, sessions]);

  const exportToExcel = () => {
    if (!processedStudents || processedStudents.length === 0) return;
    const data = processedStudents.map(s => {
      const row: any = {
        'Student Name': s.name,
        'Reg No': s.regNo,
      };
      sessions.forEach(sess => {
        row[sess.title] = s.scores[sess.id] !== undefined ? s.scores[sess.id] : '-';
      });
      row['Total Score'] = s.totalScore;
      row['Percentage'] = `${s.percentage.toFixed(1)}%`;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CA Sheet");
    XLSX.writeFile(wb, `CA_Sheet_${classId}.xlsx`);
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background p-6 overflow-auto" : "relative"}>
      <Card className="h-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
             <CardTitle>Master CA Spreadsheet</CardTitle>
             <p className="text-sm text-muted-foreground">
                {processedStudents.length} Students • {sessions.length} Assessments
             </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="min-w-[200px] sticky left-0 bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student</TableHead>
                        {sessions.map(session => (
                        <TableHead key={session.id} className="text-center min-w-[120px]">
                            <div className="flex flex-col items-center gap-2 py-2">
                            <span className="font-semibold text-xs uppercase tracking-wider">{session.title}</span>
                            <div className="flex items-center gap-1">
                                <Checkbox
                                    id={`inc-${session.id}`}
                                    checked={session.includeInCalculation}
                                    onCheckedChange={() => toggleInclude(session.id, session.includeInCalculation)}
                                />
                                <label htmlFor={`inc-${session.id}`} className="text-[10px] cursor-pointer text-muted-foreground whitespace-nowrap">
                                    Include
                                </label>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Max: {session.totalMarks}</span>
                            </div>
                        </TableHead>
                        ))}
                        <TableHead className="text-right min-w-[100px] font-bold">Total</TableHead>
                        <TableHead className="text-right min-w-[80px] font-bold">%</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {processedStudents.map((student) => (
                        <TableRow key={student.id} className="hover:bg-muted/50">
                        <TableCell className="sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium">
                            <div className="flex flex-col">
                                <span>{student.name}</span>
                                <span className="text-xs text-muted-foreground">{student.regNo}</span>
                            </div>
                        </TableCell>
                        {sessions.map(session => (
                            <TableCell key={session.id} className={`text-center ${!session.includeInCalculation ? 'opacity-40 bg-muted/20' : ''}`}>
                            {student.scores[session.id] !== undefined ? (
                                <span className={student.scores[session.id] < (session.totalMarks * 0.5) ? "text-destructive font-medium" : ""}>
                                    {student.scores[session.id]}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">-</span>
                            )}
                            </TableCell>
                        ))}
                        <TableCell className="text-right font-bold text-base">{student.totalScore}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                            <span className={`px-2 py-1 rounded ${student.percentage < 50 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {student.percentage.toFixed(1)}%
                            </span>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
