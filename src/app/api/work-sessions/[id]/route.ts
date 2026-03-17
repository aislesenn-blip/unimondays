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
      const allowed = ['strictDeadline', 'areGradesReleased', 'includeInCalculation', 'allowAppeals', 'appealDeadline', 'releaseMode', 'confidenceThreshold', 'rubricUrl', 'rubric', 'markingScheme'];
      const data: any = {};
      for (const key of allowed) {
          if (key in body) data[key] = body[key];
      }

      // If a new PDF marking scheme is uploaded but no text rubric is provided, explicitly nullify the old rubric text
      // to force the background engine to re-extract the fresh PDF.
      if (data.markingScheme && data.markingScheme !== existing.markingScheme) {
          if (!data.rubric) {
              data.rubric = null; // Force cold-start cache invalidation for the new PDF
          }
      }

      const session = await prisma.workSession.update({
          where: { id },
          data
      });

      // If the rubric was explicitly nullified (new PDF uploaded), we can optionally pre-warm the rubric here.
      // However, for pure fault tolerance, the grading-worker is designed to lazily cache it on the first run.
      // We will ensure the grading-worker handles this robustly without 504 timeouts.

      return NextResponse.json(session);
  } catch (e) {
      console.error("Update failed", e);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
