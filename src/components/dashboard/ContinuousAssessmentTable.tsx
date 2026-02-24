"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ContinuousAssessmentTable() {
  // Mock data for CA
  const students = [
    { id: 1, name: "Baraka Juma", reg: "2021-04-0012", q1: 85, q2: 78, a1: 90, mid: 82, group: 88, total: 84.6, status: "Good" },
    { id: 2, name: "Amina Hassan", reg: "2021-04-0045", q1: 92, q2: 95, a1: 88, mid: 90, group: 92, total: 91.4, status: "Excellent" },
    { id: 3, name: "Juma Ali", reg: "2021-04-0022", q1: 45, q2: 50, a1: 0, mid: 42, group: 60, total: 39.4, status: "Risk" },
    { id: 4, name: "Sarah M.", reg: "2021-04-0099", q1: 76, q2: 80, a1: 75, mid: 78, group: 80, total: 77.8, status: "Good" },
    { id: 5, name: "Daniel K.", reg: "2021-04-0102", q1: 88, q2: 85, a1: 82, mid: 85, group: 90, total: 86.0, status: "Excellent" },
  ];

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Quiz 1 (10%)</TableHead>
            <TableHead className="text-right">Quiz 2 (10%)</TableHead>
            <TableHead className="text-right">Assign 1 (20%)</TableHead>
            <TableHead className="text-right">Midterm (30%)</TableHead>
            <TableHead className="text-right">Group (30%)</TableHead>
            <TableHead className="text-right">Total (100%)</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.reg}</div>
              </TableCell>
              <TableCell className="text-right">{s.q1}</TableCell>
              <TableCell className="text-right">{s.q2}</TableCell>
              <TableCell className="text-right">
                {s.a1 === 0 ? <span className="text-destructive font-bold">MISSING</span> : s.a1}
              </TableCell>
              <TableCell className="text-right">{s.mid}</TableCell>
              <TableCell className="text-right">{s.group}</TableCell>
              <TableCell className="text-right font-bold">{s.total}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
