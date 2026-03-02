import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { triggerNextJob } from '@/lib/jobs';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { filePath, workSessionId } = body;

    if (!filePath || !workSessionId) {
      return NextResponse.json({ error: 'Missing filePath or workSessionId' }, { status: 400 });
    }

    // 1. Create the Submission Record in the database
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

    // 2. Trigger the background processing job (MAP_SUBMISSION)
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
