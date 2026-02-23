"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateQuiz() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    code: '',
    totalMarks: 100,
    rubric: ''
  });

  const handleSubmit = async () => {
    // In a real app, we would POST to /api/quiz/create
    console.log("Creating quiz:", form);
    alert("Quiz Created (Simulation)");
    router.push('/lecturer/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 flex justify-center items-center">
      <Card className="w-full max-w-2xl shadow-xl border-zinc-200">
        <CardHeader>
          <CardTitle className="text-2xl font-light">Create New Assessment</CardTitle>
          <CardDescription>Configure quiz parameters and grading rubric.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block text-zinc-700">Assessment Title</label>
            <Input
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="e.g. Computer Science 101 Midterm"
                className="h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block text-zinc-700">Quiz Code (Unique)</label>
                <Input
                    value={form.code}
                    onChange={e => setForm({...form, code: e.target.value})}
                    placeholder="e.g. CS101-MID"
                    className="h-12 font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-zinc-700">Total Marks</label>
                <Input
                    type="number"
                    value={form.totalMarks}
                    onChange={e => setForm({...form, totalMarks: parseInt(e.target.value)})}
                    className="h-12"
                />
              </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-zinc-700">Grading Rubric (AI Instructions)</label>
            <textarea
                className="w-full min-h-[200px] p-4 rounded-md border border-input bg-white text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 resize-none shadow-sm"
                placeholder="Paste your marking scheme here. e.g. 'Question 1: 10 marks. Award full marks for mentioning X, Y, Z...'"
                value={form.rubric}
                onChange={e => setForm({...form, rubric: e.target.value})}
            />
            <p className="text-xs text-zinc-400 mt-2">The AI will use this rubric to grade submissions semantically.</p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Link href="/lecturer/dashboard"><Button variant="outline" className="h-12 px-6">Cancel</Button></Link>
            <Button onClick={handleSubmit} className="bg-zinc-900 text-white hover:bg-zinc-800 h-12 px-8">Create Assessment</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
