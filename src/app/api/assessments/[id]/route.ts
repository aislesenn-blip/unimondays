import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await validateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { status, strictness, deadline } = body;

    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Access check
    if (user.role === 'LECTURER' && quiz.lecturerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate inputs
    const validStatuses = ['DRAFT', 'PUBLISHED', 'GRADING', 'RELEASED'];
    if (status && !validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const validStrictness = ['LENIENT', 'MODERATE', 'STRICT'];
    if (strictness && !validStrictness.includes(strictness)) {
        return NextResponse.json({ error: 'Invalid strictness' }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (strictness) updateData.strictness = strictness;
    if (deadline) updateData.deadline = new Date(deadline);

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedQuiz);
  } catch (error) {
    console.error("Update Assessment Error:", error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}
