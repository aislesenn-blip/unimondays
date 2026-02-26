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

    // 2. Fetch Submissions
    const submissions = await prisma.submission.findMany({
        where: { userId },
        include: {
            workSession: {
                select: {
                    title: true,
                    status: true,
                    deadline: true,
                    releaseMode: true,
                    totalMarks: true,
                    lecturer: {
                        select: { fullName: true }
                    }
                }
            },
            score: true
        },
        orderBy: { submittedAt: 'desc' }
    });

    // 3. Process Logic (Masking)
    const processedSubmissions = submissions.map(sub => {
        const { workSession, score, status } = sub;
        const now = new Date();

        let isReleased = false;

        // Release Logic
        if (workSession.releaseMode === 'AUTO') {
            isReleased = true;
        } else if (workSession.releaseMode === 'DEADLINE') {
            if (workSession.deadline && now > workSession.deadline) {
                isReleased = true;
            }
        } else if (workSession.releaseMode === 'MANUAL') {
            isReleased = false;
        } else if (workSession.releaseMode === 'RELEASED') { // Case insensitive check?
             isReleased = true;
        }

        // Override: If not graded, can't be released
        if (status !== 'GRADED' && status !== 'APPEALED' && status !== 'FLAGGED') {
            isReleased = false;
        }

        // Construct response object
        return {
            id: sub.id,
            workSessionTitle: workSession.title,
            lecturerName: workSession.lecturer.fullName,
            submittedAt: sub.submittedAt,
            status: isReleased ? status : (status === 'PENDING' || status === 'PROCESSING' ? status : 'WAITING_RELEASE'),
            score: isReleased ? score?.totalMarks : null,
            totalMarks: workSession.totalMarks,
            remarks: isReleased ? score?.remarks : null,
            feedback: isReleased ? sub.feedback : null,
            breakdown: isReleased ? score?.breakdown : null,
            filePath: sub.filePath,
            isReleased
        };
    });

    return NextResponse.json({ success: true, data: processedSubmissions });

  } catch (error: any) {
    console.error("Fetch Submissions Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
