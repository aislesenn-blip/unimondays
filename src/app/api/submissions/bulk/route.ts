import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';
import { storage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user || user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const quizId = formData.get('quizId') as string;

    if (!files.length || !quizId) {
      return NextResponse.json({ error: 'Missing files or quizId' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        if (!file.type.startsWith('application/pdf') && !file.type.startsWith('image/')) {
           errors.push({ name: file.name, error: 'Invalid file type' });
           continue;
        }

        const path = await storage.uploadFile(file, 'submissions');

        // Create Submission
        const submission = await prisma.submission.create({
          data: {
            quizId: quiz.id,
            universityId: user.universityId!,
            // No student linked yet for physical scripts (anonymous until OCR/Manual)
            filePath: path,
            status: 'PROCESSING',
            submittedAt: new Date(),
          }
        });

        // Create AI_GRADE Job
        await prisma.job.create({
          data: {
            type: 'AI_GRADE',
            status: 'PENDING',
            payload: { submissionId: submission.id },
            universityId: user.universityId!
          }
        });

        results.push({ id: submission.id, name: file.name, status: 'uploaded' });

      } catch (e: any) {
        console.error(`Error processing file ${file.name}:`, e);
        errors.push({ name: file.name, error: e.message });
      }
    }

    return NextResponse.json({ success: true, results, errors });
  } catch (error: any) {
    console.error("Bulk Upload Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
