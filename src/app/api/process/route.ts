import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { submissionId } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // 1. Find Submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { quiz: true }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // 2. Check Permissions (User must own submission or be admin/lecturer)
    // If user is STUDENT, they can only process their own submission.
    // If LECTURER, they can process any submission for their quiz/university.
    if (user.role === 'STUDENT' && submission.userId !== user.id) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Update Submission Status
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'PROCESSING' }
    });

    // 4. Create Job (Idempotent: Check if job already exists for this submission?)
    // But jobs are cheap, let's create a new one to force reprocessing if needed.
    // Or just check if there's a PENDING job.
    const existingJob = await prisma.job.findFirst({
        where: {
            type: 'AI_GRADE',
            status: 'PENDING',
            payload: {
                path: ['submissionId'],
                equals: submissionId
            }
        }
    });

    let jobId;
    if (!existingJob) {
        const job = await prisma.job.create({
            data: {
                type: 'AI_GRADE',
                payload: { submissionId },
                status: 'PENDING',
                universityId: submission.universityId
            }
        });
        jobId = job.id;
    } else {
        jobId = existingJob.id;
    }

    return NextResponse.json({ success: true, jobId });

  } catch (error) {
    console.error("Process Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
