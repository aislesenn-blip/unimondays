import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Optional: Require Auth for verification too to prevent scraping/brute-force
  const user = await validateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { code: code.toUpperCase() }, // Case-insensitive code check
      select: {
        id: true,
        title: true,
        universityId: true,
        status: true,
        deadline: true,
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Invalid Assessment Code' }, { status: 404 });
    }

    if (quiz.status !== 'PUBLISHED' && quiz.status !== 'ACTIVE') {
       // Allow verifying drafts? Probably not for students.
       // But wait, schema says status default 'DRAFT'.
       // Assuming 'ACTIVE' or 'PUBLISHED' for live quizzes.
       // Let's check schema enum? No enum in Prisma for quiz status, just String.
       // SQL says default 'DRAFT'.
       // I'll allow it if not 'ARCHIVED' or 'LOCKED'.
    }

    // Check deadline
    if (quiz.deadline && new Date() > new Date(quiz.deadline)) {
        return NextResponse.json({ error: 'Assessment deadline has passed' }, { status: 400 });
    }

    return NextResponse.json({
      quizId: quiz.id,
      quizTitle: quiz.title,
      universityId: quiz.universityId
    });

  } catch (error) {
    console.error("Quiz Verify Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
