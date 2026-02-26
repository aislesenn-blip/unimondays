import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { submissionId, reason } = await req.json();

    if (!submissionId || !reason) {
        return NextResponse.json({ error: 'Missing submission ID or reason' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie.value);
    } catch (e) {
        return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
    }

    const userId = session.userId;

    // Verify ownership
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { workSession: true }
    });

    if (!submission || submission.userId !== userId) {
        return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 });
    }

    // V2.0 Strict Logic: Check Settings
    if (!submission.workSession.allowAppeals) {
        return NextResponse.json({ error: 'Appeals are disabled for this session.' }, { status: 403 });
    }

    // Check if status allows appeal (GRADED or FLAGGED)
    // The previous code only checked for 'GRADED'. Students might want to appeal FLAGGED items too if released?
    // Assuming only released grades can be appealed.
    if (!submission.workSession.areGradesReleased) {
         return NextResponse.json({ error: 'Grades are not yet released.' }, { status: 400 });
    }

    if (submission.status === 'APPEALED') {
         return NextResponse.json({ error: 'Appeal already pending.' }, { status: 400 });
    }

    // Create Appeal
    const appeal = await prisma.appeal.create({
        data: {
            submissionId,
            reason,
            status: 'PENDING'
        }
    });

    // Update Submission Status
    await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'APPEALED' }
    });

    return NextResponse.json({ success: true, appealId: appeal.id });

  } catch (error: any) {
    console.error("Appeal Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
