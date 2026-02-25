import { NextRequest, NextResponse } from 'next/server';
import { enqueueJob } from '@/lib/queue';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await validateRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'LECTURER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { quizId } = body;

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quizId' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { lecturer: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Ownership Check
    if (quiz.lecturerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const job = await enqueueJob(
      'EXPORT_ZIP',
      { quizId },
      5,
      undefined,
      user.universityId || undefined
    );

    // Audit Log
    await prisma.auditLog.create({
      data: {
        universityId: user.universityId,
        action: 'EXPORT',
        details: `Export initiated for Quiz ${quizId}, Job ${job.id}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        // userAgent: request.headers.get('user-agent'),
        severity: 'INFO'
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Export started.'
    });

  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
