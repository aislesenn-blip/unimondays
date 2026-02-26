import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const session = await prisma.workSession.findUnique({
      where: { id },
      include: {
        class: true,
        submissions: {
          include: {
            user: true,
            score: true
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'WorkSession not found' }, { status: 404 });
    }

    if (session.lecturerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching work session:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
      // Verify ownership
      const existing = await prisma.workSession.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (existing.lecturerId !== user.id && user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const body = await req.json();

      // Filter allowed fields for security
      const allowed = ['strictDeadline', 'areGradesReleased', 'includeInCalculation', 'allowAppeals', 'releaseMode', 'confidenceThreshold'];
      const data: any = {};
      for (const key of allowed) {
          if (key in body) data[key] = body[key];
      }

      const session = await prisma.workSession.update({
          where: { id },
          data
      });

      return NextResponse.json(session);
  } catch (e) {
      console.error("Update failed", e);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
