"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function LecturerDashboard() {
  const [stats, setStats] = useState({
    totalScripts: 0,
    averageScore: 0,
    flags: 0,
    outliers: []
  });

  useEffect(() => {
    // In real app: fetch('/api/analytics')
    setStats({
      totalScripts: 142,
      averageScore: 68.5,
      flags: 3,
      outliers: []
    });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      {/* Sidebar */}
      <aside className="w-72 bg-zinc-950 text-zinc-400 p-8 hidden lg:flex flex-col justify-between sticky top-0 h-screen">
        <div>
            <h2 className="text-white text-2xl font-bold tracking-tight mb-12">PLAYBOOK</h2>
            <nav className="space-y-2">
            <Link href="/lecturer/dashboard" className="flex items-center gap-3 px-4 py-3 bg-zinc-900 text-white rounded-lg transition-all">
                <span>Dashboard</span>
            </Link>
            <Link href="/lecturer/quiz/create" className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 hover:text-white rounded-lg transition-all">
                <span>Create Assessment</span>
            </Link>
            <Link href="/lecturer/grading" className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 hover:text-white rounded-lg transition-all">
                <span>Marking Queue</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 hover:text-white rounded-lg transition-all">
                <span>Students</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 hover:text-white rounded-lg transition-all">
                <span>Settings</span>
            </Link>
            </nav>
        </div>

        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-xl border border-zinc-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">AI Insight</p>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">"Class B average dropped by 5% this week. Question 3 was the primary pain point."</p>
            <Button variant="outline" className="w-full mt-4 bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs h-8">Ask Assistant</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between md:items-center mb-12 gap-6">
            <div>
                <h1 className="text-4xl font-light text-zinc-900 tracking-tight">Dashboard</h1>
                <p className="text-zinc-500 mt-2">Overview of recent assessment cycles.</p>
            </div>
            <Link href="/lecturer/quiz/create">
                <Button className="bg-zinc-900 text-white hover:bg-zinc-800 h-12 px-8 text-base shadow-lg shadow-zinc-200">New Assessment</Button>
            </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Scripts</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-bold text-zinc-900">{stats.totalScripts}</div></CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Avg Score</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-bold text-zinc-900">{stats.averageScore}%</div></CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Pending Flags</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-bold text-red-600">{stats.flags}</div></CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Completion</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-bold text-zinc-900">92%</div></CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-zinc-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Live incoming scripts & grading status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-0 divide-y divide-zinc-100">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="flex justify-between items-center py-4 hover:bg-zinc-50 px-2 rounded-lg transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600 border border-zinc-200">S{i}</div>
                                    <div>
                                        <p className="font-medium text-zinc-900">Student {202400+i}</p>
                                        <p className="text-xs text-zinc-500">Submitted {i*2}m ago • Quiz CS101</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 font-medium">Processing</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-8">
                <Card className="border-red-100 bg-red-50/50 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-red-900">Outliers Detected</CardTitle>
                        <CardDescription className="text-red-700/70">Students requiring attention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            <li className="flex justify-between items-center p-3 bg-white border border-red-100 text-red-700 rounded-lg text-sm shadow-sm">
                                <span className="font-medium">CS-2024-001</span>
                                <span className="font-bold">12% (Risk)</span>
                            </li>
                            <li className="flex justify-between items-center p-3 bg-white border border-green-100 text-green-700 rounded-lg text-sm shadow-sm">
                                <span className="font-medium">CS-2024-045</span>
                                <span className="font-bold">99% (Top)</span>
                            </li>
                        </ul>
                        <Button variant="outline" className="w-full mt-6 bg-white border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300">View Full Report</Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 text-zinc-300 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">System Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span>DeepSeek API</span>
                            <span className="text-green-400">Operational</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Gemini Vision</span>
                            <span className="text-green-400">Operational</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Database</span>
                            <span className="text-green-400">Connected</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
