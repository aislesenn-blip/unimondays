import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { prisma } from '@/lib/prisma';
import { handleAiGrade } from '@/workers/grading-worker';

export const maxDuration = 300; // 5 min
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ status: "Vercel OOM Protected Queue" });
}

export const POST = verifySignatureAppRouter(
    async (req: NextRequest) => {
        console.log("[PLAYBOOK-TRACE] [SECURITY] QStash Signature Verified for payload.");
        console.log("[QUEUE] Wakeup: Project 1000 - Sequential Mode");

        try {
            // STRICTLY 1 JOB PER LAMBDA TO AVOID 300s TIMEOUT
            // FIX: Use OR clause to fetch PENDING jobs where retryCount is less than 3 OR null
            // This prevents jobs from silently being excluded due to Prisma inequality quirks.
            const jobs = await prisma.job.findMany({
                where: {
                    status: 'PENDING',
                    OR: [
                        { retryCount: { lt: 3 } },
                        { retryCount: null }
                    ]
                },
                orderBy: { createdAt: 'asc' },
                take: 1
            });

            if (jobs.length === 0) {
                console.log("[QUEUE] Empty queue.");
                return NextResponse.json({ processed: 0 });
            }

            console.log(`[QUEUE] Processing ${jobs.length} jobs sequentially.`);

            // SEQUENTIAL FOR-LOOP (The antidote to Vercel 504s)
            for (const job of jobs) {
                console.log(`[QUEUE] -> Starting Job ${job.id}`);
                await prisma.job.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

                try {
                    if (job.type === 'AI_GRADE_SUBMISSION') {
                        await handleAiGrade(job);
                    }

                    await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED' } });
                    console.log(`[QUEUE] -> Job ${job.id} SUCCESS`);

                } catch (err: any) {
                    console.error(`[QUEUE] -> Job ${job.id} FAILED:`, err.message);

                    if (process.env.DEBUG_MODE === 'true') {
                         await prisma.systemLog.create({
                             data: {
                                 level: 'ERROR',
                                 message: `Job ${job.id} failed execution`,
                                 metadata: JSON.stringify({ error: err.message, stack: err.stack, jobType: job.type })
                             }
                         });
                    }

                    // Fallback to PENDING for 3 retries
                    const retryCount = (job.retryCount || 0) + 1;
                    const newStatus = retryCount >= 3 ? 'FAILED' : 'PENDING';

                    await prisma.job.update({
                        where: { id: job.id },
                        data: { status: newStatus, error: err.message, retryCount }
                    });

                    // IF it failed permanently, ensure the submission status doesn't stay stuck in GRADING forever
                    if (newStatus === 'FAILED' && job.payload) {
                        try {
                             const rawPayload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                             const actualPayload = rawPayload.payload ? rawPayload.payload : rawPayload;
                             const subId = actualPayload.submissionId;

                             if (subId) {
                                  await prisma.submission.update({
                                      where: { id: subId },
                                      data: { status: 'FAILED', feedback: 'System encountered a fatal error while grading. Please contact support.' }
                                  });
                             }
                        } catch (e) {
                             console.error("Failed to update submission status after terminal job failure.");
                        }
                    }
                }
            }

            console.log("[QUEUE] Batch Complete.");

            const remaining = await prisma.job.count({ where: { status: 'PENDING' } });

            return NextResponse.json({ processed: jobs.length, remaining });

        } catch (fatalError: any) {
            console.error("[QUEUE] FATAL ERROR", fatalError);
            return NextResponse.json({ error: fatalError.message }, { status: 500 });
        }
    },
    {
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || 'dummy_current_key',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || 'dummy_next_key'
    }
);
