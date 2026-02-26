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
    const { workSessionId } = body;

    if (!workSessionId) {
      return NextResponse.json({ error: 'Missing workSessionId' }, { status: 400 });
    }

    const session = await prisma.workSession.findUnique({
      where: { id: workSessionId },
      include: { lecturer: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'WorkSession not found' }, { status: 404 });
    }

    // Ownership Check
    if (session.lecturerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const job = await enqueueJob(
      'EXPORT_ZIP',
      { workSessionId },
      5,
      user.universityId || undefined
    );

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        universityId: user.universityId,
        action: 'EXPORT',
        details: `Export initiated for Session ${workSessionId}, Job ${job.id}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
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
