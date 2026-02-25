"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, XCircle, Clock, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AppealsPage() {
  const [appeals, setAppeals] = useState([
    {
      id: "1",
      student: "Juma Ali",
      regNo: "2021-04-0022",
      work: "Mid-Semester Quiz 1",
      question: "Q2",
      reason: "I believe my recursion logic is correct, just inefficient.",
      status: "PENDING",
      date: "2 hours ago"
    },
    {
      id: "2",
      student: "Sarah M.",
      regNo: "2021-04-0099",
      work: "Assignment 1",
      question: "General",
      reason: "Missing marks for formatting section.",
      status: "RESOLVED",
      date: "1 day ago"
    }
  ]);

  const handleAction = (id: string, action: string) => {
    if (action === "Reject") {
        setAppeals(prev => prev.map(a => a.id === id ? { ...a, status: "REJECTED" } : a));
        alert(`Appeal #${id} rejected.`);
    } else if (action === "Accept") {
        setAppeals(prev => prev.map(a => a.id === id ? { ...a, status: "RESOLVED" } : a));
        alert(`Appeal #${id} accepted. Marks updated.`);
    } else {
        alert(`Opening review panel for Appeal #${id}...`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Appeals Management</h2>
        <p className="text-muted-foreground">Review and resolve student grade disputes.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student or reg no..." className="pl-9" />
        </div>
        <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter Status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appeals List</CardTitle>
          <CardDescription>Requests requiring your attention.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Work / Question</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appeals.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No appeals found.
                      </TableCell>
                  </TableRow>
              ) : (
                  appeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell>
                        <div className="font-medium">{appeal.student}</div>
                        <div className="text-xs text-muted-foreground">{appeal.regNo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{appeal.work}</div>
                        <Badge variant="outline" className="mt-1">{appeal.question}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm text-muted-foreground truncate" title={appeal.reason}>
                          "{appeal.reason}"
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {appeal.date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={appeal.status === 'PENDING' ? 'secondary' : (appeal.status === 'REJECTED' ? 'destructive' : 'default')}
                               className={appeal.status === 'PENDING' ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : (appeal.status === 'RESOLVED' ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "")}>
                          {appeal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {appeal.status === 'PENDING' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction(appeal.id, "Reject")}>
                                    Reject
                                </Button>
                                <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAction(appeal.id, "Accept")}>
                                    Accept
                                </Button>
                              </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleAction(appeal.id, "Review")}>
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
