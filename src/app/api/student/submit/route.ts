import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase'; // Admin Client
import { Client } from "@upstash/qstash";
import { getPdfPageCount } from '@/lib/pdf-utils';

export const maxDuration = 300; // Vercel timeout protection
const CHUNK_SIZE = 2; // Reduced to 2 pages per worker to prevent OpenRouter timeouts

export async function POST(req: NextRequest) {
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

    // 4. Security: Verify File Exists in Storage (Server-Side Check)
    // We use the Admin Client to verify metadata. This prevents users from linking arbitrary files.
    // We verify the file exists in the 'exam_pdfs' bucket (or default bucket).

    // Cleanup path if it contains bucket name or leading slash
    // Supabase path: 'submissions/xyz.pdf'
    let cleanPath = filePath;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);

    // List files in the folder to see if our file is there
    // This is cheaper/safer than downloading it.
    // Or we can try getPublicUrl head check, but listing is good.
    const folder = cleanPath.split('/').slice(0, -1).join('/');
    const filename = cleanPath.split('/').pop();

    const { data: fileList, error: listError } = await supabase
        .storage
        .from('exam_pdfs')
        .list(folder, {
            search: filename
        });

    if (listError || !fileList || fileList.length === 0) {
        console.warn(`[Security] File not found in storage: ${cleanPath} for user ${userId}`);
        return NextResponse.json({ error: 'Security Verification Failed: Uploaded file not found.' }, { status: 400 });
    }

    // Double check exact match
    const foundFile = fileList.find(f => f.name === filename);
    if (!foundFile) {
         return NextResponse.json({ error: 'Security Verification Failed: File mismatch.' }, { status: 400 });
    }

    // 5. Verify Work Session & Deadline
    const workSession = await prisma.workSession.findUnique({
        where: { id: targetWorkSessionId }
    });

    if (!workSession) {
        return NextResponse.json({ error: 'Invalid Work Session' }, { status: 404 });
    }

    // V2.0 Strict Deadline Logic
    // MANDATE 1: Strict Deadline Enforcement
    // If a deadline is set, it acts as a hard cutoff unless explicitly configured otherwise.
    // The previous check relied on `workSession.strictDeadline`, which might default to false.
    // We enforce it generally if the deadline exists and has passed.
    if (workSession.deadline) {
        const now = new Date();
        // Allow a 60-second grace period for network latency
        const gracePeriod = new Date(workSession.deadline.getTime() + 60 * 1000);

        if (now > gracePeriod) {
             // If strictDeadline is EXPLICITLY false, we might allow late submissions (flagged).
             // But the mandate implies clarity and enforcement.
             // If strictDeadline is true OR undefined (default behavior for safety), we block.
             if (workSession.strictDeadline !== false) {
                 return NextResponse.json({
                     error: 'Submission Rejected: The deadline for this assignment has passed.'
                 }, { status: 403 });
             }
        }
    }

    // 6. Use the verified file path
    const fileUrl = cleanPath;

    // 7. Create or Update Submission (Idempotent)
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
        // Clear old scores to trigger re-grading
        await prisma.score.deleteMany({ where: { submissionId: submission.id } });
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

    // 8. MAP-REDUCE QSTASH DISPATCH (OCR Phase First)
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    try {
        // Calculate chunks
        const totalPages = await getPdfPageCount(submission.filePath);

        if (totalPages <= 0) {
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'FAILED', feedback: 'Empty PDF or unable to read pages.' }
            });
            throw new Error("PDF has 0 pages.");
        }

        const chunks = [];
        for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
            const pageBatch = [];
            for (let j = 0; j < CHUNK_SIZE && (i + j) <= totalPages; j++) {
                pageBatch.push(i + j);
            }
            chunks.push(pageBatch);
        }

        // Initialize Atomic Tracking State
        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'PROCESSING',
                totalChunks: chunks.length,
                processedChunks: 0,
                extractedData: []
            }
        });

        // Initialize QStash and Dispatch
        const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
        const messages = chunks.map(pageBatch => ({
            url: `${baseUrl}/api/grade/ocr`,
            body: { submissionId: submission.id, pages: pageBatch, pdfUrl: submission.filePath }
        }));

        await qstash.batchJSON(messages);
        console.log(`[SUBMIT] Successfully dispatched ${chunks.length} Map-Reduce jobs to QStash.`);

    } catch (dispatchError: any) {
        console.error("[SUBMIT] Failed to dispatch to QStash:", dispatchError);
        // We still return success to the student, the job table will act as a fallback/retry mechanism if implemented
    }

    return NextResponse.json({ success: true, submissionId: submission.id, message: "Submission queued for grading." });

  } catch (error: any) {
    console.error("Submit Error:", error);
    return NextResponse.json({ error: 'Submission failed due to an internal error. Please try again.' }, { status: 500 });
  }
}
