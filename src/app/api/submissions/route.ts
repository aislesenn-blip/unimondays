import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { code, fileUrl, answers } = body;

    // 1. Find Quiz by Code
    const quiz = await prisma.quiz.findUnique({
      where: { code },
      include: {
        university: true,
        class: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Invalid Assessment Code' }, { status: 404 });
    }

    // 1b. Enforce Business Rules (Feature Consumption Audit)
    // Check Quiz Status
    if (quiz.status !== 'PUBLISHED' && quiz.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Assessment is not active.' }, { status: 403 });
    }

    // Check Class Status
    if (quiz.class && quiz.class.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Session is archived or locked.' }, { status: 403 });
    }

    // Check Deadline
    if (quiz.deadline && new Date() > quiz.deadline) {
      return NextResponse.json({ error: 'Submission deadline has passed.' }, { status: 403 });
    }

    // 2. Check if already submitted? (Optional strictness)
    // For now, allow overwrite or create new. Schema enforces unique(quizId, userId).

    // 3. Create Submission
    const submission = await prisma.submission.upsert({
      where: {
        quizId_userId: {
          quizId: quiz.id,
          userId: user.id
        }
      },
      update: {
        status: 'PENDING',
        filePath: fileUrl,
        submittedAt: new Date(),
        // We can store answers in a JSON field if needed, but schema only has ocrText or file_path.
        // Assuming file upload is the primary submission method.
        // If answers (text) are provided, we could append to ocrText or a notes field?
        // Let's store answers as ocrText for now if provided? Or just ignore if file is primary.
        // The mock UI has textarea. Let's prepend answers to ocrText placeholder.
        ocrText: answers ? `[Student Answers]\n${JSON.stringify(answers, null, 2)}` : undefined
      },
      create: {
        quizId: quiz.id,
        userId: user.id,
        universityId: quiz.universityId,
        studentName: user.fullName,
        studentRegNo: user.email, // Or separate field if exists
        status: 'PENDING',
        filePath: fileUrl,
        submittedAt: new Date(),
        ocrText: answers ? `[Student Answers]\n${JSON.stringify(answers, null, 2)}` : undefined
      }
    });

    // 4. Log Audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        universityId: quiz.universityId,
        action: 'SUBMISSION_CREATED',
        details: `Submission for ${quiz.code} uploaded.`,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    // 5. Trigger AI Grading Job
    await prisma.job.create({
      data: {
        type: 'AI_GRADE',
        payload: { submissionId: submission.id },
        status: 'PENDING',
        universityId: quiz.universityId
      }
    });

    return NextResponse.json({ success: true, id: submission.id });

  } catch (error) {
    console.error("Submission Error:", error);
    return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
  }
}
