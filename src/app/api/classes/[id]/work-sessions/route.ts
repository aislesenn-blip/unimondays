import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
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
    const {
        title,
        deadline,
        rubric,
        rubricUrl,
        markingScheme,
        goldStandardUrl,
        questionPaperUrl,
        instructions,
        calibration,
        strictness,
        releaseMode,
        totalMarks,
        saveAsDefault
    } = body;

    if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Generate unique workCode
    let workCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        // Simple 6-char random string
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        workCode = result;

        const existing = await prisma.workSession.findUnique({ where: { workCode } });
        if (!existing) {
            isUnique = true;
        } else {
            attempts++;
        }
    }

    if (!isUnique) {
        // Fallback to timestamp based
        workCode = `WK-${Date.now().toString().slice(-4)}`;
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
        goldStandardUrl: goldStandardUrl || null,
        questionPaperUrl: questionPaperUrl || null,
        instructions: instructions || '',
        calibration: calibration || null, // Stored as JSON string
        strictness: strictness || 'MODERATE',
        totalMarks: totalMarks ? parseInt(totalMarks) : 100,
        releaseMode: releaseMode || 'MANUAL',
        status: 'PUBLISHED'
      }
    });

    // Save as default settings if requested
    if (saveAsDefault && calibration) {
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { calibrationSettings: calibration }
            });
        } catch (e) {
            console.warn("Failed to save user calibration settings", e);
        }
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error creating work session:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
