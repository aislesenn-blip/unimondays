import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';
import { enqueueJob } from '@/lib/queue';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quizId = formData.get('quizId') as string;

    if (!file || !quizId) {
      return NextResponse.json({ error: 'Missing file or quizId' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
       // Allow image for bulk? Usually bulk is one large PDF.
       // Prompt says "ONE large PDF".
       return NextResponse.json({ error: 'Only PDF files are allowed for bulk upload.' }, { status: 400 });
    }

    // Save file
    const filePath = await uploadFile(file, 'bulk_uploads');

    // Create Job
    const job = await enqueueJob('OCR_SPLIT', {
      filePath,
      quizId: parseInt(quizId)
    }, 10, parseInt(quizId));

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Bulk upload started. Use /api/jobs/[id] to track progress.'
    });

  } catch (error: any) {
    console.error('Bulk Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
