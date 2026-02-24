"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-4">
      {/* Calibration Header */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <span className="font-semibold text-yellow-900">Calibration Check:</span>
            <span className="text-yellow-800 ml-1">Ensure total weightage equals 100%. Current: <span className="font-bold">100%</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <Label htmlFor="auto-calc" className="text-yellow-900 cursor-pointer">Auto-Calculate</Label>
             <Switch id="auto-calc" defaultChecked />
           </div>
           <Button size="sm" variant="outline" className="h-8 border-yellow-300 bg-yellow-100 hover:bg-yellow-200 text-yellow-900">
             <Settings2 className="h-3 w-3 mr-2" /> Configure Weights
           </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Student</TableHead>
              <TableHead className="text-right">
                <div>Quiz 1</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100 (10%)</div>
              </TableHead>
              <TableHead className="text-right">
                <div>Quiz 2</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100 (10%)</div>
              </TableHead>
              <TableHead className="text-right">
                <div>Assign 1</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100 (20%)</div>
              </TableHead>
              <TableHead className="text-right">
                <div>Midterm</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100 (30%)</div>
              </TableHead>
              <TableHead className="text-right">
                <div>Group</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100 (30%)</div>
              </TableHead>
              <TableHead className="text-right">
                <div>Total</div>
                <div className="text-[10px] text-muted-foreground font-normal">Max: 100%</div>
              </TableHead>
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
                  {s.a1 === 0 ? <span className="text-destructive font-bold text-xs bg-destructive/10 px-2 py-1 rounded">MISSING</span> : s.a1}
                </TableCell>
                <TableCell className="text-right">{s.mid}</TableCell>
                <TableCell className="text-right">{s.group}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
