"use client";
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ResultPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/submission/${params.id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.status === 'COMPLETED' || json.status === 'FLAGGED' || json.status === 'ERROR') {
            setLoading(false);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
    const interval = setInterval(() => {
        if (loading) fetchData();
    }, 2000);

    return () => clearInterval(interval);
  }, [params.id, loading]);

  if (!data) return <div className="min-h-screen flex items-center justify-center bg-zinc-50">Loading result...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8 mt-10">
        <div className="flex justify-between items-center">
             <h1 className="text-2xl font-light tracking-tight">Assessment Result</h1>
             <Link href="/student"><Button variant="outline">Back to Home</Button></Link>
        </div>

        <Card className="shadow-lg border-zinc-200">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Submission Status</CardTitle>
                        <CardDescription>ID: {data.id}</CardDescription>
                    </div>
                    <Badge variant={data.status === 'COMPLETED' ? 'success' : data.status === 'FLAGGED' ? 'destructive' : 'default'}>
                        {data.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {data.status === 'PENDING' || data.status === 'PROCESSING' ? (
                    <div className="text-center py-20">
                        <div className="animate-spin h-10 w-10 border-4 border-zinc-900 border-t-transparent rounded-full mx-auto mb-6"></div>
                        <p className="text-lg font-medium">AI is analyzing your script...</p>
                        <p className="text-sm text-zinc-500">This involves OCR extraction, academic validation, and rubric matching.</p>
                    </div>
                ) : data.status === 'COMPLETED' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="text-center py-10 bg-zinc-50 rounded-xl border border-zinc-100">
                            <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold">Total Score</p>
                            <h2 className="text-7xl font-bold mt-4 tracking-tighter">{data.score}</h2>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Feedback</h3>
                            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                                <p className="text-zinc-700 italic leading-relaxed">"{data.result?.remarks}"</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Question Breakdown</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.result?.breakdown && Object.entries(data.result.breakdown).map(([q, s]: [string, any]) => (
                                    <div key={q} className="flex justify-between p-4 bg-white border border-zinc-200 rounded-lg">
                                        <span className="font-medium text-zinc-600">{q}</span>
                                        <span className="font-bold text-zinc-900">{s} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div>
                            <h3 className="text-lg font-medium mb-4">AI Audit Log</h3>
                            <div className="bg-zinc-950 text-zinc-400 p-6 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                {data.result?.auditLog}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-red-600">
                        <p className="font-bold text-xl mb-2">Issue Detected</p>
                        <p className="text-zinc-600">{data.result?.remarks || "An error occurred during processing."}</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
