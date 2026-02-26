"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CAOverviewProps {
  data: any[]; // Aggregated data
}

export function CAOverview({ data }: CAOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Continuous Assessment Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
           <p className="text-muted-foreground text-sm">No graded submissions yet.</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Total Score</TableHead>
              <TableHead className="text-right">Average %</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="text-right">{student.totalScore}</TableCell>
                <TableCell className="text-right">{student.average.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{student.submissionCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
