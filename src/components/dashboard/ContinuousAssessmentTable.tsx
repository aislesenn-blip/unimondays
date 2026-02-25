import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export async function ContinuousAssessmentTable({ sessionId }: { sessionId: number }) {
  // Fetch Data
  const students = await prisma.studentEnrollment.findMany({
    where: { classId: sessionId, status: "ACTIVE" },
    include: { user: true },
    orderBy: { user: { fullName: "asc" } }
  });

  const works = await prisma.quiz.findMany({
    where: { classId: sessionId, deletedAt: null },
    orderBy: { createdAt: "asc" }
  });

  const submissions = await prisma.submission.findMany({
    where: { quiz: { classId: sessionId } },
    include: { score: true }
  });

  // Aggregation Logic
  const data = students.map(enrollment => {
    const student = enrollment.user;
    const studentSubmissions = submissions.filter(s => s.userId === student.id);

    let totalWeightedScore = 0;

    const scores: Record<number, { score: number, max: number, status: string } | null> = {};

    works.forEach(work => {
      const sub = studentSubmissions.find(s => s.quizId === work.id);
      const score = sub?.score?.totalMarks || 0;
      const max = work.totalMarks || 100;
      const weight = work.weight || 0;

      if (sub && sub.score) {
        totalWeightedScore += (score / max) * weight;
      }

      scores[work.id] = sub ? {
        score,
        max,
        status: sub.status
      } : null;
    });

    let status = "Good";
    if (totalWeightedScore < 40) status = "Risk";
    if (totalWeightedScore > 80) status = "Excellent";

    return {
      id: student.id,
      name: student.fullName || student.email,
      reg: student.email,
      scores,
      total: totalWeightedScore.toFixed(1),
      status
    };
  });

  return (
    <div className="space-y-4">
      {/* Calibration Header */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <span className="font-semibold text-yellow-900">Calibration Check:</span>
            <span className="text-yellow-800 ml-1">Total Weight: <span className="font-bold">{works.reduce((a, b) => a + (b.weight || 0), 0)}%</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Button size="sm" variant="outline" className="h-8 border-yellow-300 bg-yellow-100 hover:bg-yellow-200 text-yellow-900">
             <Settings2 className="h-3 w-3 mr-2" /> Configure Weights
           </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[200px]">Student</TableHead>
              {works.map(work => (
                <TableHead key={work.id} className="text-right min-w-[100px]">
                  <div>{work.title}</div>
                  <div className="text-[10px] text-muted-foreground font-normal">Max: {work.totalMarks} ({work.weight}%)</div>
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[100px]">
                <div>Total</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100%</div>
              </TableHead>
              <TableHead className="text-center min-w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.reg}</div>
                </TableCell>
                {works.map(work => {
                  const scoreData = s.scores[work.id];
                  return (
                    <TableCell key={work.id} className="text-right">
                      {scoreData ? (
                        scoreData.score
                      ) : (
                        <span className="text-muted-foreground text-xs italic">N/A</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-bold text-base">{s.total}</TableCell>
                <TableCell className="text-center">
                  {s.status === "Risk" ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> Risk
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className={s.status === "Excellent" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : ""}>
                      {s.status === "Excellent" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {s.status}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={works.length + 3} className="text-center py-8 text-muted-foreground">
                  No students enrolled.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
