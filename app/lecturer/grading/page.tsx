"use client";
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import Link from 'next/link';

export default function GradingQueue() {
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    // Mock fetch
    setSubmissions([
      { id: 'S1', regNo: 'CS-2024-001', quiz: 'CS101', status: 'COMPLETED', score: 12, confidence: 0.95 },
      { id: 'S2', regNo: 'CS-2024-002', quiz: 'CS101', status: 'PROCESSING', score: null, confidence: null },
      { id: 'S3', regNo: 'CS-2024-003', quiz: 'CS101', status: 'FLAGGED', score: 0, confidence: 0.1 },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans text-zinc-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between md:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
                <Link href="/lecturer/dashboard"><Button variant="ghost" className="text-zinc-500 hover:text-zinc-900">&larr; Dashboard</Button></Link>
                <h1 className="text-3xl font-light text-zinc-900 tracking-tight">Marking Queue</h1>
            </div>
            <p className="text-zinc-500 ml-4">Live feed of incoming scripts and AI grading status.</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">Pause Queue</Button>
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg">Export Results (Excel)</Button>
          </div>
        </header>

        <Card className="shadow-lg border-zinc-200">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Recent Submissions</CardTitle>
                        <CardDescription>Real-time processing log.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-500">Auto-Refresh: ON</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-zinc-50">
                        <TableRow>
                            <TableHead className="w-[100px] text-zinc-500 font-semibold uppercase text-xs tracking-wider pl-6">ID</TableHead>
                            <TableHead className="text-zinc-500 font-semibold uppercase text-xs tracking-wider">Reg No</TableHead>
                            <TableHead className="text-zinc-500 font-semibold uppercase text-xs tracking-wider">Assessment</TableHead>
                            <TableHead className="text-zinc-500 font-semibold uppercase text-xs tracking-wider">Status</TableHead>
                            <TableHead className="text-zinc-500 font-semibold uppercase text-xs tracking-wider text-right">Score</TableHead>
                            <TableHead className="text-zinc-500 font-semibold uppercase text-xs tracking-wider text-center">AI Confidence</TableHead>
                            <TableHead className="text-zinc-500 font-semibold uppercase text-xs tracking-wider text-right pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.map((sub) => (
                            <TableRow key={sub.id} className="hover:bg-zinc-50/50 transition-colors">
                                <TableCell className="font-mono text-xs text-zinc-400 pl-6">{sub.id}</TableCell>
                                <TableCell className="font-medium text-zinc-900">{sub.regNo}</TableCell>
                                <TableCell className="text-zinc-600">{sub.quiz}</TableCell>
                                <TableCell>
                                    <Badge variant={sub.status === 'COMPLETED' ? 'success' : sub.status === 'FLAGGED' ? 'destructive' : 'secondary'} className="uppercase text-[10px] tracking-wider font-bold px-2 py-1">
                                        {sub.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-bold text-zinc-900 text-right text-lg">{sub.score !== null ? `${sub.score}` : '-'}</TableCell>
                                <TableCell className="w-[150px]">
                                    {sub.confidence ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            <div className="w-20 bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                                                <div className={`h-1.5 rounded-full ${sub.confidence > 0.8 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${sub.confidence * 100}%` }}></div>
                                            </div>
                                            <span className="text-xs text-zinc-400 font-mono">{Math.round(sub.confidence * 100)}%</span>
                                        </div>
                                    ) : <div className="text-center text-zinc-300">-</div>}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">Review</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
