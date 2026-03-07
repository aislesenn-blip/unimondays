import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('auth-session');

        if (!sessionCookie) {
             return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });
        }

        let session;
        try {
            session = JSON.parse(sessionCookie.value);
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
        }

        const userId = session.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
        }

        const body = await req.json();
        const { workSessionId } = body;

        if (!workSessionId) {
            return NextResponse.json({ error: 'Missing workSessionId' }, { status: 400 });
        }

        // Verify Ownership
        const workSession = await prisma.workSession.findUnique({
            where: { id: workSessionId, lecturerId: userId }
        });

        if (!workSession) {
            return NextResponse.json({ error: 'Work Session not found or unauthorized' }, { status: 403 });
        }

        // 1. Bulk Reset Submissions (Keep OCR text to save Gemini vision costs if only grading logic changed)
        await prisma.submission.updateMany({
            where: { workSessionId: workSessionId },
            data: {
                status: 'PENDING',
                feedback: null,
                confidenceScore: null
            }
        });

        // 2. Delete Old Scores
        await prisma.score.deleteMany({
            where: { submission: { workSessionId: workSessionId } }
        });

        // 3. Fetch submissions to create jobs
        const submissions = await prisma.submission.findMany({
            where: { workSessionId: workSessionId },
            select: { id: true }
        });

        if (submissions.length > 0) {
        // 4. Trigger Serverless Map-Reduce for all submissions
            const protocol = req.headers.get('x-forwarded-proto') || 'http';
            const host = req.headers.get('host');
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        const triggerUrl = `${baseUrl}/api/grade/trigger`;

        console.log(`[BATCH_REGRADE] Triggering Map-Reduce for ${submissions.length} submissions: ${triggerUrl}`);

        // Fire and forget triggers sequentially
        // To avoid swamping the event loop or Vercel, we can Promise.all a bounded concurrent map or just fire sequentially
        for (const sub of submissions) {
            fetch(triggerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: sub.id })
            }).catch(err => console.error(`[BATCH_REGRADE] Failed to trigger sub ${sub.id}:`, err));
        }
        }

        return NextResponse.json({ success: true, count: submissions.length, message: "Batch regrading initialized." });

    } catch (error: any) {
        console.error("[BATCH_REGRADE_ERROR]", error);
        return NextResponse.json({ error: 'Failed to initialize batch re-grade due to a system error.' }, { status: 500 });
    }
}
