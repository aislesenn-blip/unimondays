import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateRequest(req);
  if (!user || user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: quizId } = await params;

    // 1. Verify Quiz ownership
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (quiz.universityId !== user.universityId) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Find ungraded submissions
    const submissions = await prisma.submission.findMany({
      where: {
        quizId: quizId,
        status: { in: ['PENDING', 'SUBMITTED'] } // Don't re-grade PROCESSING/GRADED unless forced (not implemented)
      }
    });

    // 3. Create Jobs
    let jobCount = 0;
    for (const sub of submissions) {
        // Check for existing pending job
        const existingJob = await prisma.job.findFirst({
            where: {
                type: 'AI_GRADE',
                status: 'PENDING',
                payload: {
                    path: ['submissionId'],
                    equals: sub.id
                }
            }
        });

        if (!existingJob) {
            await prisma.job.create({
                data: {
                    type: 'AI_GRADE',
                    payload: { submissionId: sub.id },
                    status: 'PENDING',
                    universityId: user.universityId
                }
            });

            // Update submission status to PROCESSING
            await prisma.submission.update({
                where: { id: sub.id },
                data: { status: 'PROCESSING' }
            });

            jobCount++;
        }
    }

    return NextResponse.json({ success: true, queued: jobCount });

  } catch (error) {
    console.error("Grade All Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
