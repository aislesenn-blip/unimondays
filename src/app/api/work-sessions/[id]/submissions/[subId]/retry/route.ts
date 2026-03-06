import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    // 1. Authenticate (Lecturer Only)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie.value);
    } catch (e) {
        return NextResponse.json({ error: "Invalid Session" }, { status: 401 });
    }

    const userId = session.userId;
    if (!userId || session.role === 'STUDENT') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: workSessionId, subId: submissionId } = await params;

    console.log(`[RETRY] Lecturer ${userId} retrying submission ${submissionId}`);

    // 2. Verify Submission & Ownership
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { workSession: true }
    });

    if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.workSessionId !== workSessionId) {
        return NextResponse.json({ error: "Submission mismatch" }, { status: 400 });
    }

    if (submission.workSession.lecturerId !== userId) {
        return NextResponse.json({ error: "Unauthorized access to this session" }, { status: 403 });
    }

    // 3. Reset State for Retry (Safe Deletion)
    // First, delete any existing score (idempotent: safe even if no score exists)
    await prisma.score.deleteMany({
        where: { submissionId: submission.id }
    });

    // Then, reset the submission status back to PENDING
    await prisma.submission.update({
        where: { id: submissionId },
        data: {
            status: 'PENDING',
            feedback: null // Clear previous error logs or feedback
        }
    });

    // 4. Insert Job into the Database Queue
    await prisma.job.create({
        data: {
            type: 'AI_GRADE_SUBMISSION',
            payload: JSON.stringify({ submissionId: submission.id }),
            status: 'PENDING'
        }
    });

    // 5. Wake up the master Queue Processor
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const queueUrl = `${baseUrl}/api/queue/process`;

    console.log(`[RETRY] Triggering Queue: ${queueUrl}`);

    // Fire & Forget
    fetch(queueUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error("[RETRY] Failed to trigger queue processor", err));

    return NextResponse.json({ success: true, message: "Grading retry initiated successfully." });

  } catch (error: any) {
    console.error("[RETRY_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
