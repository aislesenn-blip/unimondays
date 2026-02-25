"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, XCircle, Clock, Filter, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Appeal {
  id: string;
  submissionId: string;
  reason: string;
  status: string;
  createdAt: string;
  submission: {
    quiz: {
      title: string;
      code: string;
    };
    user: {
      fullName: string;
      email: string;
    } | null;
    studentName: string | null;
    studentRegNo: string | null;
  };
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/appeals')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAppeals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAction = async (id: string, action: string) => {
    const status = action === "Accept" ? "APPROVED" : "REJECTED";
    try {
        const res = await fetch('/api/appeals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, comment: `Marked as ${status} by lecturer.` })
        });
        if (res.ok) {
            setAppeals(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        }
    } catch (e) {
        console.error(e);
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
          {loading ? (
             <div className="flex justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Work</TableHead>
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
                        <div className="font-medium">
                            {appeal.submission.studentName || appeal.submission.user?.fullName || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {appeal.submission.studentRegNo || appeal.submission.user?.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{appeal.submission.quiz.title}</div>
                        <Badge variant="outline" className="mt-1">{appeal.submission.quiz.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm text-muted-foreground truncate" title={appeal.reason}>
                          "{appeal.reason}"
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(appeal.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={appeal.status === 'PENDING' ? 'secondary' : (appeal.status === 'REJECTED' ? 'destructive' : 'default')}
                               className={appeal.status === 'PENDING' ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : (appeal.status === 'APPROVED' ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "")}>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
