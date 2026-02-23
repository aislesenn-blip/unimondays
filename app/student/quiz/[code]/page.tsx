"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export default function QuizPage({ params }: { params: { code: string } }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    // In a real app, we'd look up the quiz ID by code.
    // For this demo, we assume the code passed IS the quiz ID or we mock it.
    formData.append('quiz_id', params.code);
    formData.append('student_id', "student_demo");

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Submission failed");
      }

      const data = await res.json();
      if (data.status === 'queued') {
        router.push(`/student/result/${data.submission_id}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
       <Card className="w-full max-w-2xl shadow-xl bg-white border-zinc-200">
         <CardHeader>
           <CardTitle className="text-2xl font-light">Assessment Code: {params.code}</CardTitle>
           <CardDescription>Upload your handwritten script (PDF or Image). Ensure your RegNo is visible.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           <div className="border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center hover:bg-zinc-50 transition-colors">
             <div className="flex flex-col items-center gap-4">
                <svg className="w-12 h-12 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <input type="file" onChange={handleFileChange} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-700 transition-all cursor-pointer"/>
                <p className="text-sm text-zinc-400">Supported formats: JPG, PNG, PDF</p>
             </div>
           </div>

           <Button className="w-full h-12 text-lg bg-zinc-900 hover:bg-zinc-800 text-white" onClick={handleSubmit} disabled={loading || !file}>
             {loading ? "Uploading & Processing..." : "Submit Script"}
           </Button>
         </CardContent>
       </Card>
    </div>
  );
}
