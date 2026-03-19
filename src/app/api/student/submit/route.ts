import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { Client } from "@upstash/qstash";
import { getPdfPageCount } from '@/lib/pdf-utils';

export const maxDuration = 300;
// L8 MANDATE: Strictly 1 page per worker to prevent Vercel Out-Of-Memory (OOM) crashes
const CHUNK_SIZE = 1;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

  if (DEBUG_MODE) console.log(`[DEBUG] [UPLOAD_STAGE] Initiating file ingestion...`);

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
    const { filePath, workSessionId, workCode } = body;

    if (!filePath) return NextResponse.json({ error: 'Missing file path' }, { status: 400 });

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

    let cleanPath = filePath;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
    const folder = cleanPath.split('/').slice(0, -1).join('/');
    const filename = cleanPath.split('/').pop();

    const { data: fileList, error: listError } = await supabase.storage.from('exam_pdfs').list(folder, { search: filename });

    if (listError || !fileList || fileList.length === 0) {
        return NextResponse.json({ error: 'Security Verification Failed: Uploaded file not found.' }, { status: 400 });
    }

    const foundFile = fileList.find(f => f.name === filename);
    if (!foundFile) return NextResponse.json({ error: 'Security Verification Failed: File mismatch.' }, { status: 400 });

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
    if (existingSubmission) {
        submission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: { filePath: cleanPath, status: 'PENDING', submittedAt: new Date(), ocrText: null, feedback: null }
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
            data: { workSessionId: targetWorkSessionId, userId, studentName: session.email, filePath: cleanPath, status: 'PENDING' }
        });
    }

    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    try {
        const totalPages = await getPdfPageCount(submission.filePath);
        if (totalPages <= 0) {
            await prisma.submission.update({ where: { id: submission.id }, data: { status: 'FAILED', feedback: 'Empty PDF.' }});
            throw new Error("PDF has 0 pages.");
        }

        const chunks = [];
        for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
            const pageBatch = [];
            for (let j = 0; j < CHUNK_SIZE && (i + j) <= totalPages; j++) pageBatch.push(i + j);
            chunks.push(pageBatch);
        }

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'PROCESSING', totalChunks: chunks.length, processedChunks: 0, extractedData: [] }
        });

        const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

        // L8 MANDATE: Strict Staggering (30s delay) to prevent OpenRouter DDoS & Vercel Overlap
        const messages = chunks.map((pageBatch, index) => ({
            url: `${baseUrl}/api/grade/ocr`,
            body: { submissionId: submission.id, pages: pageBatch, chunkIndex: index, pdfUrl: submission.filePath },
            delay: `${index * 30}s`
        }));

        await qstash.batchJSON(messages as any);
        console.log(`[SUBMIT] Successfully dispatched ${chunks.length} staggered jobs to QStash.`);

        return NextResponse.json({ success: true, submissionId: submission.id, message: "Submission queued for grading." });

    } catch (dispatchError: any) {
        console.error("[SUBMIT] Failed to dispatch to QStash:", dispatchError);
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'FAILED', feedback: 'Failed to queue document. Please try again.' }
        }).catch(()=>null);
        return NextResponse.json({ error: 'Failed to queue submission.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Submit Error:", error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}