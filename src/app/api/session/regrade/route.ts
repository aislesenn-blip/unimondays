import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await validateRequest(req);
        if (!user || user.role === 'STUDENT') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { workSessionId } = body;

        if (!workSessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }

        // Verify ownership
        const session = await prisma.workSession.findUnique({
            where: { id: workSessionId }
        });

        if (!session || session.lecturerId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get all submissions for this session
        const submissions = await prisma.submission.findMany({
            where: { workSessionId: workSessionId }
        });

        if (submissions.length === 0) {
            return NextResponse.json({ message: "No submissions to regrade." }, { status: 200 });
        }

        const submissionIds = submissions.map(s => s.id);

        // 1. Delete all existing scores for these submissions
        await prisma.score.deleteMany({
            where: { submissionId: { in: submissionIds } }
        });

        // 2. Reset status of all submissions to PENDING
        await prisma.submission.updateMany({
            where: { id: { in: submissionIds } },
            data: {
                status: 'PENDING',
                feedback: null,
                confidenceScore: null
            }
        });

        // 3. Create fresh Jobs for the queue processor
        const jobsToCreate = submissionIds.map(subId => ({
            type: 'AI_GRADE_SUBMISSION',
            payload: JSON.stringify({ submissionId: subId }),
            status: 'PENDING'
        }));

        await prisma.job.createMany({
            data: jobsToCreate
        });

        // 4. Wake up the master Queue Processor
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        const queueUrl = `${baseUrl}/api/queue/process`;

        // Fire & Forget
        fetch(queueUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error("[BATCH_REGRADE] Failed to trigger queue", err));

        return NextResponse.json({
            success: true,
            message: `Initiated regrade for ${submissions.length} submissions.`
        });

    } catch (error: any) {
        console.error("[BATCH_REGRADE_ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}