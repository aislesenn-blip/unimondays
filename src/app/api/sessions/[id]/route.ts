import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await validateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const session = await prisma.classes.findUnique({
      where: { id }
    });

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Access check
    if (user.role === 'LECTURER' && session.lecturerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(session);
  } catch (error) {
     console.error("Get Session Error:", error);
     return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await validateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['ACTIVE', 'ARCHIVED', 'LOCKED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const session = await prisma.classes.findUnique({
      where: { id }
    });

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Access check
    if (user.role === 'LECTURER' && session.lecturerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedSession = await prisma.classes.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Update Session Error:", error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
