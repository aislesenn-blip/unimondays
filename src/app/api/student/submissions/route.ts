import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { enqueueJob } from '@/lib/queue';

// GET: List "My Submissions"
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: user.id },
      include: {
        workSession: {
          include: {
            class: true
          }
        },
        score: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Apply Visibility Logic (Masking)
    const sanitized = submissions.map(sub => {
       const session = sub.workSession;
       let showGrade = false;

       if (session.releaseMode === 'AUTO') {
           showGrade = true;
       } else if (session.releaseMode === 'DEADLINE') {
           if (session.deadline && new Date() > session.deadline) {
               showGrade = true;
           }
       } else {
           // MANUAL: We don't have a specific "released" flag on Submission/Score in schema?
           // Wait, Schema has `Score` but no `isReleased`.
           // Prompt says "Manual Approval (Lecturer must click publish)".
           // In Phase 1 `CreateWorkSessionSheet`, we have `releaseMode`.
           // But where is the "Published" state stored?
           // Usually it's implied or we need a field.
           // Schema Check: `WorkSession` has `status` (DRAFT/PUBLISHED).
           // Maybe we need `resultsReleased` boolean on WorkSession?
           // The schema doesn't have it.
           // For now, let's assume MANUAL means "Never show until changed to AUTO"?
           // Or maybe we missed a field.
           // Prompt Phase 1: "Grading Settings... Manual Approval".
           // Let's look at `Score` model: `isOverridden`.
           // Let's assume for MVP: If MANUAL, we hide it unless some other trigger.
           // Actually, if `releaseMode` is MANUAL, we just HIDE it.
           // But how does lecturer "Release"? They would update `releaseMode` to `AUTO`?
           // Yes, that's a valid workflow. Update session -> Release Results.
           showGrade = false;
       }

       // Override: If status is APPEALED, show grade? No.

       return {
         id: sub.id,
         title: session.title,
         workCode: session.workCode,
         classCode: session.class?.code,
         submittedAt: sub.submittedAt,
         status: sub.status,
         score: showGrade && sub.score ? sub.score.totalMarks : null,
         totalMarks: session.totalMarks,
         feedback: showGrade ? sub.feedback : null,
         filePath: sub.filePath
       };
    });

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("List Submissions Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create Submission (Upload)
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { workSessionId, filePath } = body;

    if (!workSessionId || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Validate Session Again (Security)
    const session = await prisma.workSession.findUnique({
      where: { id: workSessionId }
    });

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Check Deadline
    if (session.deadline && new Date() > session.deadline) {
        return NextResponse.json({ error: 'Deadline has passed' }, { status: 403 });
    }

    // 2. Create Submission
    // Handle re-submission? Schema `unique([workSessionId, userId])`.
    // Use upsert to allow overwrite? Or fail?
    // "Zero Friction" usually implies easy overwrite if allowed.
    // But audit trails prefer new records.
    // Given the unique constraint, upsert is best to prevent errors.

    // Note: We need universityId. WorkSession has it.

    const submission = await prisma.submission.upsert({
      where: {
        workSessionId_userId: {
          workSessionId: session.id,
          userId: user.id
        }
      },
      update: {
        filePath,
        status: 'PENDING', // Reset status for re-grading
        submittedAt: new Date(),
        ocrText: null, // Clear old OCR
        feedback: null, // Clear old feedback
        // Clear score? Score is separate model.
      },
      create: {
        workSessionId: session.id,
        userId: user.id,
        universityId: session.universityId,
        studentName: user.fullName,
        studentRegNo: user.email,
        filePath,
        status: 'PENDING'
      }
    });

    // If upsert updated, we should delete old score to avoid confusion
    if (submission) {
        await prisma.score.deleteMany({ where: { submissionId: submission.id } });
    }

    // 3. Enqueue AI Grading
    await enqueueJob('AI_GRADE', { submissionId: submission.id }, 0, session.universityId);

    return NextResponse.json({ success: true, id: submission.id });

  } catch (error) {
    console.error("Submission Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
