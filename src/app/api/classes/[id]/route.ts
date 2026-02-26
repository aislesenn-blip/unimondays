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
    const classItem = await prisma.classes.findUnique({
      where: { id },
      include: {
        workSessions: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { submissions: true }
            }
          }
        }
      }
    });

    if (!classItem) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (classItem.lecturerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(classItem);
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
