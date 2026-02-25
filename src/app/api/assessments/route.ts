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
    const { sessionId, title, rubric, markingScheme: providedScheme, instructions, deadline, gradingConfig } = body;

    // Map gradingConfig to schema fields
    let strictness = 'MODERATE';
    let markingScheme = providedScheme || rubric; // Use provided scheme or fallback to rubric

    if (gradingConfig) {
        // Parse gradingConfig if it's a string, or use directly if object
        const config = typeof gradingConfig === 'string' ? JSON.parse(gradingConfig) : gradingConfig;
        if (config.methodology === 'partial') strictness = 'LENIENT';
        if (config.methodology === 'strict') strictness = 'STRICT';

        // Append config details to markingScheme for context
        markingScheme += `\n\n[AI Configuration: ${JSON.stringify(config)}]`;
    }

    if (!user.universityId) {
        return NextResponse.json({ error: 'User not associated with university' }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        classId: sessionId,
        lecturerId: user.id,
        universityId: user.universityId,
        title,
        code: `QUIZ-${Date.now().toString().slice(-6)}`,
        status: 'PUBLISHED',
        rubric,
        markingScheme,
        instructions,
        strictness,
        totalMarks: 100,
        deadline: deadline ? new Date(deadline) : null
      }
    });

    return NextResponse.json({ code: quiz.code, id: quiz.id });
  } catch (error) {
    console.error("Create Assessment Error:", error);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}
