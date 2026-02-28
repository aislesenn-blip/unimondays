import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; subId: string }> }
) {
    // Authenticate
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workSessionId, subId: submissionId } = await params;

    // Validate ownership (Lecturer of the class)
    const workSession = await prisma.workSession.findUnique({
        where: { id: workSessionId },
        select: { lecturerId: true }
    });

    if (!workSession || workSession.lecturerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { totalScore, remarks } = body;

        // Update Score and Submission Status
        // 1. Update Score
        await prisma.score.upsert({
            where: { submissionId },
            update: {
                totalMarks: parseFloat(totalScore),
                remarks: remarks,
                isOverridden: true
            },
            create: {
                submissionId,
                totalMarks: parseFloat(totalScore),
                remarks: remarks,
                isOverridden: true,
                breakdown: '[]' // Default empty breakdown if creating new score
            }
        });

        // 2. Update Submission Status (Clear Flagged)
        const submission = await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'GRADED'
            }
        });

        // 3. Immutable Audit Trail for Manual Override
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'MANUAL_SCORE_OVERRIDE',
                details: `Lecturer overridden score for submission ${submissionId} to ${totalScore}. Remarks: ${remarks || 'None'}`,
                severity: 'WARNING', // Warning implies an override of the base AI evaluation
            }
        });

        return NextResponse.json({ success: true, data: submission });

    } catch (error) {
        console.error("Update Submission Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
