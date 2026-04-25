import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { waitUntil } from '@vercel/functions';

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

        // 3. Fetch submissions to grade
        const submissions = await prisma.submission.findMany({
            where: { workSessionId: workSessionId },
            select: { id: true }
        });

        if (submissions.length > 0) {
            const protocol = req.headers.get('x-forwarded-proto') || 'https';
            const host = req.headers.get('host') || 'localhost:3000';
            const baseUrl = `${protocol}://${host}`;

            console.log(`[BATCH_REGRADE] Triggering grading streams for ${submissions.length} submissions.`);

            // Use waitUntil to ensure background execution on Vercel without blocking the response.
            // Fan out requests concurrently using Promise.all to prevent sequential timeout issues.
            waitUntil(
                Promise.all(submissions.map(async (sub) => {
                    try {
                        const res = await fetch(`${baseUrl}/api/grade/stream`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || ''}`
                            },
                            body: JSON.stringify({ submissionId: sub.id }),
                        });
                        await res.text();
                    } catch (e) {
                        console.error(`Regrade stream failed for ${sub.id}:`, e);
                    }
                }))
            );
        }

        return NextResponse.json({ success: true, count: submissions.length, message: "Batch regrading initialized." });

    } catch (error: any) {
        console.error("[BATCH_REGRADE_ERROR]", error);
        return NextResponse.json({ error: 'Failed to initialize batch re-grade due to a system error.' }, { status: 500 });
    }
}
