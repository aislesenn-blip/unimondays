import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase'; // Admin Client
import { Client } from "@upstash/qstash";
import { getPdfPageCount } from '@/lib/pdf-utils';

export const maxDuration = 300; // Vercel timeout protection
const CHUNK_SIZE = 2; // Reduced to 2 pages per worker to prevent OpenRouter timeouts

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

  if (DEBUG_MODE) console.log(`[DEBUG] [UPLOAD_STAGE] Initiating file ingestion...`);

  try {
    // 1. Authenticate (Robust)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie.value);
    } catch (e) {
        return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
    }

    const userId = session.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    // 2. Parse Body (JSON)
    // MANDATE 1: Client-Side Upload Protocol
    const body = await req.json();
    const { filePath, workSessionId, workCode } = body;

    if (DEBUG_MODE) {
        console.log(`[DEBUG] [UPLOAD_STAGE] File received: ${filePath}`);
    }

    if (!filePath) {
        return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    let targetWorkSessionId = workSessionId;

    if (!targetWorkSessionId && workCode) {
        // Find session by code
        const sessionByCode = await prisma.workSession.findUnique({
            where: { workCode }
        });
        if (sessionByCode) {
            targetWorkSessionId = sessionByCode.id;
        }
    }

    if (!targetWorkSessionId) {
        return NextResponse.json({ error: 'Missing Work Session ID or Code' }, { status: 400 });
    }

    // 3. Security: Rate Limiting
    const lastSubmission = await prisma.submission.findFirst({
        where: {
            userId,
            workSessionId: targetWorkSessionId // Rate limit per assignment
        },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true }
    });

    if (lastSubmission?.submittedAt) {
        const timeSince = Date.now() - new Date(lastSubmission.submittedAt).getTime();
        const COOLDOWN_MS = 30 * 1000; // 30 Seconds Cooldown
        if (timeSince < COOLDOWN_MS) {
             const waitSeconds = Math.ceil((COOLDOWN_MS - timeSince) / 1000);
             return NextResponse.json(
                { error: `Please wait ${waitSeconds}s before resubmitting.` },
                { status: 429 }
             );
        }
    }

    // 4. Verify Work Session & Deadline
    const workSession = await prisma.workSession.findUnique({
        where: { id: targetWorkSessionId }
    });

    if (!workSession) {
        return NextResponse.json({ error: 'Invalid Work Session' }, { status: 404 });
    }

    // V2.0 Strict Deadline Logic
    // Enforce exact deadline (removed 60s grace period)
    if (workSession.deadline && new Date() > new Date(workSession.deadline)) {
         if (workSession.strictDeadline !== false) {
             return NextResponse.json({
                 error: 'Submission Rejected: The deadline for this assignment has passed.'
             }, { status: 403 });
         }
    }

    // 5. Use the verified file path
    // Cleanup path if it contains bucket name or leading slash
    let cleanPath = filePath;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
    const fileUrl = cleanPath;

    // 6. Create or Update Submission (Idempotent)
    const existingSubmission = await prisma.submission.findUnique({
        where: {
            workSessionId_userId: {
                workSessionId: targetWorkSessionId,
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

        // FIX 5: Idempotency Leak - Clear old scores AND old OCR chunks to force a fresh re-extraction
        await prisma.score.deleteMany({ where: { submissionId: submission.id } });
        await prisma.extractedChunk.deleteMany({ where: { submissionId: submission.id } });
    } else {
        submission = await prisma.submission.create({
            data: {
                workSessionId: targetWorkSessionId,
                userId,
                studentName: session.email, // Best effort fallback
                filePath: fileUrl,
                status: 'PENDING'
            }
        });
    }

    // 7. UPSTASH WORKFLOW ORCHESTRATION
    // We completely bypass the raw 300s serverless worker and job table.
    // Instead, we hand this directly to the durable Upstash Workflow orchestrator.
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    try {
        // Ensure submission remains in PENDING state (UI: "Queued for processing...")
        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'PENDING',
                totalChunks: 0,
                processedChunks: 0,
                extractedData: []
            }
        });

        // Initialize Upstash Workflow Client and trigger the orchestrator
        const { Client } = await import("@upstash/workflow");
        const client = new Client({ token: process.env.QSTASH_TOKEN! });

        // Trigger the workflow instead of publishing to a raw webhook
        await client.trigger({
            url: `${baseUrl}/api/workflow/grade`,
            body: { submissionId: submission.id }
        });

        console.log(`[SUBMIT] Successfully triggered Upstash Workflow for Submission ${submission.id}.`);

        if (DEBUG_MODE) {
            const uploadTime = Date.now() - startTime;
            console.log(`[DEBUG] [UPLOAD_STAGE] SUCCESS. Total ingestion time: ${uploadTime}ms.`);
            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    message: 'Upload Stage Completed (Linear Pipeline)',
                    metadata: JSON.stringify({ submissionId: submission.id, uploadTimeMs: uploadTime })
                }
            });
        }

    } catch (dispatchError: any) {
        console.error("[SUBMIT] Failed to queue the background job:", dispatchError);

        // Critical Fix: Fail loudly to UI if job creation or QStash ping fails
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'FAILED', feedback: 'Failed to queue document for processing. Please try again.' }
        }).catch(e => console.error("Failed to update status on dispatch error", e));

        return NextResponse.json({ error: 'Failed to queue submission due to internal database/network error. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, submissionId: submission.id, message: "Submission queued for grading." });

  } catch (error: any) {
    console.error("Submit Error:", error);
    return NextResponse.json({ error: 'Submission failed due to an internal error. Please try again.' }, { status: 500 });
  }
}
