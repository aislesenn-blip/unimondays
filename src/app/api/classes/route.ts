import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const classes = await prisma.classes.findMany({
      where: { lecturerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { workSessions: true }
        }
      }
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, code, semester, mode } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    if (!user.universityId) {
      return NextResponse.json({ error: 'User has no university' }, { status: 400 });
    }

    const newClass = await prisma.classes.create({
      data: {
        name,
        code,
        semester,
        mode,
        lecturerId: user.id,
        universityId: user.universityId,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Class code already exists' }, { status: 409 });
    }
    console.error("Error creating class:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
