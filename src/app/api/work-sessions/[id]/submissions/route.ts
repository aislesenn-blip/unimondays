import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const submissions = await prisma.submission.findMany({
      where: { workSessionId: id },
      include: {
        user: true,
        score: true,
        appeals: {
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
