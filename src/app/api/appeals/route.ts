import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user || user.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch appeals for quizzes created by this lecturer
  const appeals = await prisma.appeal.findMany({
      where: {
          submission: {
              quiz: {
                  lecturerId: user.id
              }
          }
      },
      include: {
          submission: {
              include: {
                  user: true,
                  quiz: true
              }
          }
      },
      orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(appeals);
}

export async function PUT(req: NextRequest) {
    const user = await validateRequest(req);
    if (!user || user.role !== 'LECTURER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, comment } = await req.json();

    const appeal = await prisma.appeal.update({
        where: { id },
        data: {
            status,
            adminComment: comment,
            updatedAt: new Date()
        }
    });

    return NextResponse.json(appeal);
}
