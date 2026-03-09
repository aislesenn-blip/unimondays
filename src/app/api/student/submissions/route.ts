import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
    }

        // 2.5 DLQ / Zombie Recovery
        const staleThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
        const zombieSubmissions = await prisma.submission.updateMany({
            where: {
                userId,
                status: 'PROCESSING',
                submittedAt: { lt: staleThreshold }
            },
            data: {
                status: 'FAILED',
                feedback: '[SYSTEM TIMEOUT] The AI engine encountered an unrecoverable network error. Please ask instructor to regrade.'
            }
        });

        if (zombieSubmissions.count > 0) {
            console.warn(`[PLAYBOOK-TRACE] [DLQ] Swept ${zombieSubmissions.count} zombie submissions to FAILED state.`);
        }

    // 3. Fetch Submissions
    const submissions = await prisma.submission.findMany({
        where: { userId },
        select: {
            id: true,
            submittedAt: true,
            status: true,
            feedback: true,
            filePath: true,
            workSession: {
                select: {
                    title: true,
                    status: true,
                    deadline: true,
                    releaseMode: true,
                    areGradesReleased: true, // V2.0
                    allowAppeals: true, // V2.0
                    totalMarks: true,
                    lecturer: {
                        select: { fullName: true }
                    }
                }
            },
            score: {
                select: {
                    totalMarks: true,
                    remarks: true,
                    breakdown: true
                }
            }
        },
        orderBy: { submittedAt: 'desc' }
    });

    // 3. Process Logic (Masking)
    const processedSubmissions = submissions.map(sub => {
        const { workSession, score, status } = sub;
        const now = new Date();

        let isReleased = false;

        // Release Logic (V2.0) - ENFORCED
        // Ensure "On Deadline" logic is strictly adhered to.
        // If mode is DEADLINE, we ONLY release if now >= deadline.
        // If deadline is missing, we default to MANUAL safety (not released).

        const mode = workSession.releaseMode || 'MANUAL'; // Default to manual for safety

        if (mode === 'AUTO') {
            isReleased = true;
        } else if (mode === 'DEADLINE') {
            if (workSession.deadline) {
                 if (now >= workSession.deadline) {
                    isReleased = true;
                 } else {
                    isReleased = false; // Explicitly withheld
                 }
            } else {
                isReleased = false; // Configuration Error: No deadline set, withhold results.
            }
        } else if (mode === 'MANUAL') {
            // Strictly respect the lecturer's toggle
            isReleased = !!workSession.areGradesReleased;
        } else {
             isReleased = false; // Unknown mode, fail safe.
        }

        // Override: If not successfully graded/flagged, can't be released yet.
        // We allow FLAGGED to be released if the mode allows it (so students see "Needs Review")
        if (status !== 'GRADED' && status !== 'APPEALED' && status !== 'FLAGGED') {
            isReleased = false;
        }

        // Construct response object
        return {
            id: sub.id,
            workSessionTitle: workSession.title,
            lecturerName: workSession.lecturer?.fullName || 'Unknown Lecturer',
            submittedAt: sub.submittedAt,
            // If withheld, show a friendly status instead of leaking the real one
            status: isReleased ? status : (status === 'PENDING' || status === 'PROCESSING' ? status : 'WAITING_RELEASE'),
            score: isReleased ? (sub.score ? sub.score.totalMarks : 0) : null,
            totalMarks: workSession.totalMarks || 100,
            remarks: isReleased ? (sub.score ? sub.score.remarks : null) : null,
            feedback: isReleased ? sub.feedback : null,
            breakdown: isReleased ? (sub.score ? sub.score.breakdown : null) : null,
            filePath: sub.filePath,
            allowAppeals: workSession.allowAppeals || false,
            isReleased,
            // Helper for UI to show why
            releaseInfo: !isReleased && mode === 'DEADLINE' ?
                `Results will be released after ${new Date(workSession.deadline!).toLocaleString()}` :
                (!isReleased && mode === 'MANUAL' ? "Results are withheld by instructor" : null)
        };
    });

    return NextResponse.json({ success: true, data: processedSubmissions });

  } catch (error: any) {
    console.error("Fetch Submissions Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
