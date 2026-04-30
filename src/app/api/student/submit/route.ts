import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { waitUntil } from '@vercel/functions';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

  if (DEBUG_MODE) console.log(`[DEBUG] [UPLOAD_STAGE] Initiating submission ingestion...`);

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });

    let session;
    try { session = JSON.parse(sessionCookie.value); }
    catch (e) { return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 }); }

    const userId = session.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });

    const body = await req.json();
    const { extractedText, filePath, workSessionId, workCode } = body;

    if (!extractedText) return NextResponse.json({ error: 'Missing extracted text' }, { status: 400 });

    let targetWorkSessionId = workSessionId;
    if (!targetWorkSessionId && workCode) {
        const sessionByCode = await prisma.workSession.findUnique({ where: { workCode } });
        if (sessionByCode) targetWorkSessionId = sessionByCode.id;
    }

    if (!targetWorkSessionId) return NextResponse.json({ error: 'Missing Work Session ID or Code' }, { status: 400 });

    const lastSubmission = await prisma.submission.findFirst({
        where: { userId, workSessionId: targetWorkSessionId },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true }
    });

    if (lastSubmission?.submittedAt) {
        const timeSince = Date.now() - new Date(lastSubmission.submittedAt).getTime();
        const COOLDOWN_MS = 30 * 1000;
        if (timeSince < COOLDOWN_MS) {
             const waitSeconds = Math.ceil((COOLDOWN_MS - timeSince) / 1000);
             return NextResponse.json({ error: `Please wait ${waitSeconds}s before resubmitting.` }, { status: 429 });
        }
    }

    const workSession = await prisma.workSession.findUnique({ where: { id: targetWorkSessionId } });
    if (!workSession) return NextResponse.json({ error: 'Invalid Work Session' }, { status: 404 });

    if (workSession.deadline && new Date() > new Date(workSession.deadline)) {
         if (workSession.strictDeadline !== false) {
             return NextResponse.json({ error: 'Submission Rejected: The deadline for this assignment has passed.' }, { status: 403 });
         }
    }

    const existingSubmission = await prisma.submission.findUnique({
        where: { workSessionId_userId: { workSessionId: targetWorkSessionId, userId } }
    });

    let submission;
    // Clean path for database storage
    let cleanPath = filePath;
    if (cleanPath && cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);

    if (existingSubmission) {
        submission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: { ocrText: extractedText, filePath: cleanPath, status: 'GRADING', submittedAt: new Date(), feedback: null }
        });

        // L8 BULLETPROOF GUARD: Try-catch prevents P2021 Prisma crashes if DB is not synced
        try {
            await prisma.score.deleteMany({ where: { submissionId: submission.id } });
            await prisma.extractedChunk.deleteMany({ where: { submissionId: submission.id } });
            await prisma.job.deleteMany({ where: { payload: { contains: submission.id } } });
        } catch (cleanupError) {
            console.warn("[SUBMIT] Non-fatal cleanup error (schema might be out of sync). Moving on...");
        }
    } else {
        submission = await prisma.submission.create({
            data: { workSessionId: targetWorkSessionId, userId, studentName: session.email, filePath: cleanPath, ocrText: extractedText, status: 'GRADING' }
        });
    }

    // HYDRAULIC PRESS FIX: Instead of calling the heavy API directly, enqueue a job.
    // This allows the queue processor to handle concurrency and retries without crashing Vercel or Supabase.
    await prisma.job.create({
        data: {
            type: 'AI_GRADE_SUBMISSION',
            payload: JSON.stringify({ submissionId: submission.id }),
            status: 'PENDING'
        }
    });

    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Kickstart the queue processor asynchronously so it starts working on the job immediately.
    waitUntil(
        (async () => {
            try {
                await fetch(`${baseUrl}/api/queue/process`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || ''}`
                    }
                });
            } catch (e) {
                console.error("Failed to kickstart queue processor:", e);
            }
        })()
    );

    return NextResponse.json({ success: true, submissionId: submission.id, message: "Submission received. Grading queued." });
  } catch (error: any) {
    console.error("Submit Error:", error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}