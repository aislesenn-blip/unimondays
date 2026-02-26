import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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
    const userRole = session.role || 'STUDENT';

    let notifications: any[] = [];

    if (userRole === 'LECTURER' || userRole === 'ADMIN') {
        // 1. Fetch PENDING APPEALS for this lecturer's sessions
        const appealedSubmissions = await prisma.submission.findMany({
            where: {
                status: 'APPEALED',
                workSession: {
                    lecturerId: userId
                }
            },
            include: {
                workSession: { select: { title: true, id: true } },
                appeals: {
                    where: { status: 'PENDING' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                user: { select: { fullName: true, email: true } }
            },
            orderBy: { submittedAt: 'desc' },
            take: 20
        });

        notifications = appealedSubmissions.map(sub => ({
            id: sub.id,
            type: 'APPEAL',
            action: 'Appeal Pending',
            details: `${sub.user?.fullName || sub.studentName || 'Student'} appealed ${sub.workSession.title}: "${sub.appeals[0]?.reason?.substring(0, 50)}..."`,
            timestamp: sub.appeals[0]?.createdAt || sub.submittedAt,
            link: `/dashboard/work-sessions/${sub.workSession.id}?submissionId=${sub.id}`
        }));

    } else {
        // 2. Fetch UPDATES for this STUDENT (Appeals Resolved / Grades Released)
        // Logic: Submissions that have an appeal AND represent a resolved state (e.g. status is GRADED)
        // OR simply recently graded submissions if we wanted to be broader, but mandate says "alert if appeal responded to"

        const resolvedAppeals = await prisma.submission.findMany({
            where: {
                userId: userId,
                appeals: {
                    some: {} // Has at least one appeal history
                },
                status: 'GRADED' // Resolved
            },
            include: {
                workSession: { select: { title: true } },
                appeals: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { submittedAt: 'desc' },
            take: 10
        });

        notifications = resolvedAppeals.map(sub => ({
            id: sub.id,
            type: 'APPEAL_RESOLVED',
            action: 'Appeal Resolved',
            details: `Your appeal for ${sub.workSession.title} has been processed. New Grade Available.`,
            timestamp: sub.submittedAt, // Ideally updateAt, but submittedAt is safe fallback
            link: `/student` // Redirects to portal where they can see the list
        }));
    }

    return NextResponse.json(notifications);

  } catch (error: any) {
    console.error("Notifications API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
