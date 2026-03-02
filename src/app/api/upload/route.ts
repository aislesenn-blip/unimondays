import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { triggerNextJob } from '@/lib/jobs';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workSessionId = formData.get('workSessionId') as string;

    if (!file || !workSessionId) {
      return NextResponse.json({ error: 'Missing file or workSessionId' }, { status: 400 });
    }
    
    // 1. Upload file to secure storage
    const folder = `submissions/${workSessionId}`;
    const filePath = await storage.uploadFile(file, folder);

    // 2. Create the Submission Record in the database
    const submission = await prisma.submission.create({
        data: {
            workSessionId: workSessionId,
            userId: user.id,
            filePath: filePath,
            studentName: user.fullName,
            status: 'SUBMITTED',
            // ocrText, gradingStatus, etc will be filled in by the background job
        }
    });

    // 3. Trigger the background processing job (MAP_SUBMISSION)
    await prisma.job.create({
        data: {
            type: 'MAP_SUBMISSION',
            submissionId: submission.id,
            status: 'QUEUED',
            payload: '{}'
        }
    });

    return NextResponse.json({ success: true, submissionId: submission.id });

  } catch (error: any) {
    console.error("Unified Upload & Submit Error:", error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
