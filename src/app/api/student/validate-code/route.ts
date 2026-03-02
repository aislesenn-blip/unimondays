import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workCode } = await req.json();

    if (!workCode) {
      return NextResponse.json({ error: 'Work Code is required' }, { status: 400 });
    }

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
