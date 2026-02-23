"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export default function StudentHome() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleEnter = () => {
    if (code) {
      router.push(`/student/quiz/${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-light text-zinc-900 tracking-tighter mb-2">PLAYBOOK</h1>
        <p className="text-zinc-500 text-sm tracking-widest uppercase">Student Access Layer</p>
      </div>
      <Card className="w-full max-w-md shadow-xl border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-center text-xl font-medium text-zinc-900">Enter Access Code</CardTitle>
          <CardDescription className="text-center">Enter your unique quiz code to begin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="e.g. QZ-1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center text-lg h-14 bg-zinc-50 border-zinc-200 focus:ring-zinc-900 focus:border-zinc-900"
          />
          <Button
            className="w-full h-12 text-lg bg-zinc-900 hover:bg-zinc-800 text-white"
            onClick={handleEnter}
          >
            Start Assessment
          </Button>
          <div className="pt-4 text-center">
            <p className="text-xs text-zinc-400">By entering, you agree to the Academic Integrity Policy.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
