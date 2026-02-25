import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await validateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        university: true,
        lecturer: {
          select: { fullName: true }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Find submission for this user
    const submission = await prisma.submission.findUnique({
      where: {
        quizId_userId: {
          quizId: quiz.id,
          userId: user.id
        }
      },
      include: {
        score: true
      }
    });

    if (!submission) {
       // Return 404 if no submission started, or maybe empty object?
       // Frontend AssessmentResultPage expects submission details or handles 404.
       return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: submission.id,
      status: submission.status,
      score: submission.score,
      filePath: submission.filePath,
      quiz: {
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        lecturer: quiz.lecturer
      }
    });

  } catch (error) {
    console.error("Submission Status Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
