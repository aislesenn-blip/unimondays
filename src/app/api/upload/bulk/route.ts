import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';
import { enqueueJob } from '@/lib/queue';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await validateRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'lecturer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Lecturers only' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quizIdStr = formData.get('quizId') as string;

    if (!file || !quizIdStr) {
      return NextResponse.json({ error: 'Missing file or quizId' }, { status: 400 });
    }

    const quizId = parseInt(quizIdStr);

    // Tenant Isolation Check
    // Ensure the quiz belongs to the user or their university
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { lecturer: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Strict Ownership Check
    if (quiz.lecturerId !== user.id) {
       // Allow admins of same university?
       // For now, strict ownership.
       return NextResponse.json({ error: 'Forbidden: You do not own this assessment.' }, { status: 403 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
       return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    }

    // Save file using Storage Service (Tmp/S3)
    const filePath = await uploadFile(file, 'bulk_uploads');

    // Create Job with Tenant Context
    const job = await enqueueJob(
      'OCR_SPLIT',
      { filePath, quizId },
      10,
      quizId,
      user.universityId || undefined
    );

    // Audit Log
    await prisma.auditLog.create({
      data: {
        universityId: user.universityId,
        submissionId: undefined, // Not a submission yet
        action: 'BULK_UPLOAD',
        details: `Bulk upload started for Quiz ${quizId}, Job ${job.id}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        severity: 'INFO'
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Bulk upload started.'
    });

  } catch (error: any) {
    console.error('Bulk Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
