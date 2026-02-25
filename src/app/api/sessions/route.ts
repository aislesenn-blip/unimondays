import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user || user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, code, semester, mode } = body;

    if (!user.universityId) {
        return NextResponse.json({ error: 'User not associated with university' }, { status: 400 });
    }

    const session = await prisma.classes.create({
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

    return NextResponse.json(session);
  } catch (error) {
    console.error("Create Session Error:", error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
