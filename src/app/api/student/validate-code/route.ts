import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { workCode } = await req.json();

    if (!workCode) {
      return NextResponse.json({ error: 'Work Code is required' }, { status: 400 });
    }

    // 1. Verify Authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Work Session
    const workSession = await prisma.workSession.findUnique({
      where: { workCode },
      include: {
        lecturer: {
          select: { fullName: true }
        }
      }
    });

    if (!workSession) {
      return NextResponse.json({ error: 'Invalid Work Code' }, { status: 404 });
    }

    // 3. Check Status and Deadline
    if (workSession.status === 'DRAFT' || workSession.status === 'ARCHIVED') {
        return NextResponse.json({ error: 'This session is not currently active.' }, { status: 403 });
    }

    const now = new Date();
    let isOverdue = false;
    if (workSession.deadline && now > workSession.deadline) {
        isOverdue = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: workSession.id,
        title: workSession.title,
        lecturerName: workSession.lecturer.fullName,
        deadline: workSession.deadline,
        status: workSession.status,
        instructions: workSession.instructions,
        isOverdue
      }
    });

  } catch (error: any) {
    console.error("Validate Code Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
