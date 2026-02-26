import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateRequest(req);
  if (!user || user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: classId } = await params;

  try {
    const classItem = await prisma.classes.findUnique({ where: { id: classId } });
    if (!classItem) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    if (classItem.lecturerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, deadline, rubric, rubricUrl, markingScheme, strictness, releaseMode, totalMarks } = body;

    if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Generate unique workCode
    let workCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        workCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existing = await prisma.workSession.findUnique({ where: { workCode } });
        if (!existing) {
            isUnique = true;
        } else {
            attempts++;
            workCode = ''; // Retry
        }
    }

    // Fallback if loop failed to find unique code
    if (!workCode) {
         workCode = Date.now().toString(36).substring(6).toUpperCase();
    }

    const session = await prisma.workSession.create({
      data: {
        title,
        workCode,
        classId,
        lecturerId: user.id,
        deadline: deadline ? new Date(deadline) : null,
        rubric: rubric || '',
        rubricUrl: rubricUrl || null,
        markingScheme: markingScheme || '',
        strictness: strictness || 'MODERATE',
        totalMarks: totalMarks ? parseInt(totalMarks) : 100,
        releaseMode: releaseMode || 'MANUAL',
        status: 'PUBLISHED'
      }
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error creating work session:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
