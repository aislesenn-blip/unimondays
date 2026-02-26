import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { uploadFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
    }

    // 2. Parse Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workSessionId = formData.get('workSessionId') as string;

    if (!file || !workSessionId) {
        return NextResponse.json({ error: 'Missing file or work session ID' }, { status: 400 });
    }

    // 3. Verify Work Session & Deadline
    const workSession = await prisma.workSession.findUnique({
        where: { id: workSessionId }
    });

    if (!workSession) {
        return NextResponse.json({ error: 'Invalid Work Session' }, { status: 404 });
    }

    if (workSession.deadline && new Date() > workSession.deadline) {
        return NextResponse.json({ error: 'Deadline has passed.' }, { status: 403 });
    }

    // 4. Upload File
    const fileUrl = await uploadFile(file, 'submissions');

    // 5. Create Submission
    const existingSubmission = await prisma.submission.findUnique({
        where: {
            workSessionId_userId: {
                workSessionId,
                userId
            }
        }
    });

    let submission;
    if (existingSubmission) {
        // Update existing submission
        submission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: {
                filePath: fileUrl,
                status: 'PENDING',
                submittedAt: new Date(),
                ocrText: null, // Reset OCR if re-submitting
                feedback: null
            }
        });
        // Also delete old score if any?
        await prisma.score.deleteMany({ where: { submissionId: submission.id } });
    } else {
        submission = await prisma.submission.create({
            data: {
                workSessionId,
                userId,
                universityId: workSession.universityId,
                studentName: session.email, // Or fetch full name
                filePath: fileUrl,
                status: 'PENDING'
            }
        });
    }

    // 6. Trigger AI Grading Worker
    await prisma.job.create({
        data: {
            type: 'AI_GRADE',
            payload: JSON.stringify({ submissionId: submission.id }),
            status: 'PENDING',
            universityId: workSession.universityId
        }
    });

    return NextResponse.json({ success: true, submissionId: submission.id });

  } catch (error: any) {
    console.error("Submit Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
