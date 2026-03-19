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
            // FIX: ATOMIC QUEUE CLAIMING TO PREVENT LAMBDA RACE CONDITIONS
            // Instead of finding and updating separately, we find a PENDING job and instantly update to PROCESSING.
            // PostgreSQL will handle the lock, ensuring no two workers grab the same job.

            const pendingJobs = await prisma.job.findMany({
                where: {
                    status: 'PENDING',
                    OR: [
                        { retryCount: { lt: 3 } },
                        { retryCount: null }
                    ]
                },
                orderBy: { createdAt: 'asc' },
                take: 1, // Look for the oldest available job
                select: { id: true }
            });

            if (pendingJobs.length === 0) {
                console.log("[QUEUE] Empty queue.");
                return NextResponse.json({ processed: 0 });
            }

            // ATOMIC CLAIM: Try to be the one to flip it from PENDING to PROCESSING
            const targetJobId = pendingJobs[0].id;
            const claimedJob = await prisma.job.updateMany({
                where: { id: targetJobId, status: 'PENDING' },
                data: { status: 'PROCESSING' }
            });

            // If count is 0, another Vercel lambda beat us to it in the last 100ms.
            if (claimedJob.count === 0) {
                console.log(`[QUEUE] Job ${targetJobId} was claimed by another worker. Exiting gracefully.`);
                return NextResponse.json({ processed: 0 });
            }

            // We successfully claimed it! Now fetch the full job payload safely.
            const job = await prisma.job.findUnique({
                where: { id: targetJobId }
            });

            if (!job) {
                console.log(`[QUEUE] Job ${targetJobId} disappeared after claiming.`);
                return NextResponse.json({ processed: 0 });
            }

            console.log(`[QUEUE] -> Successfully Claimed and Starting Job ${job.id}`);

            // We only process the single claimed job in this serverless function
            const jobs = [job]; // Keeping the array format to minimize code disruption below

            for (const job of jobs) {

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
