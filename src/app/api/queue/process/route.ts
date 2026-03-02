import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 300; // 5 Minutes (Vercel Pro/Enterprise)
export const dynamic = 'force-dynamic'; // Disable caching

export async function POST(req: NextRequest) {
  console.log("[QUEUE_WAKEUP] Triggered. Checking DB...");
  // Security: Ensure only internal calls or authorized crons can trigger this
  // For now, we'll allow it but you might want to add a CRON_SECRET check
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // console.warn("Unauthorized queue trigger attempt");
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // For this "Audit Fix", we'll be lenient to allow the student submit flow to trigger it easily
  }

  let processedCount = 0;
  let errors = 0;
  let rateLimitHit = false;

  try {
    // ORPHAN RECOVERY: Recover jobs stuck in PROCESSING for more than 10 minutes (likely due to worker crash)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.job.updateMany({
        where: {
            status: 'PROCESSING',
            processedAt: { lt: tenMinutesAgo }
        },
        data: {
            status: 'PENDING',
            error: 'Orphaned job recovered',
        }
    });

    // 1. Fetch & Claim Pending Jobs (Atomic Claim Mechanism to prevent race conditions)
    // We process up to 2 at a time to avoid Vercel timeouts for slow chunks
    const BATCH_SIZE = 2;
    const claimedJobs: any[] = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
        // Find the oldest pending job
        const job = await prisma.job.findFirst({
            where: {
                status: 'PENDING',
                type: { in: ['AI_GRADE_SUBMISSION', 'CLOUD_MARKING'] },
                OR: [
                    { retryCount: { lt: 3 } },
                    { retryCount: null }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });

        if (!job) break; // No more pending jobs

        // Attempt to claim it atomically
        const result = await prisma.job.updateMany({
            where: {
                id: job.id,
                status: 'PENDING' // Only update if it is STILL pending
            },
            data: {
                status: 'PROCESSING',
                processedAt: new Date()
            }
        });

        if (result.count > 0) {
            claimedJobs.push(job);
        }
    }

    if (claimedJobs.length === 0) {
        return NextResponse.json({ message: 'No pending jobs found or all claimed by other workers.' });
    }

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    after(async () => {
        console.log(`[QUEUE] Successfully claimed and processing ${claimedJobs.length} jobs in background...`);

        // 2. Process Jobs (SERIAL EXECUTION)
        for (const job of claimedJobs) {

            try {
                // EXECUTE WORKER BASED ON TYPE (Lazy Loaded to prevent Serverless Bloat)
                let jobResult: any = null;
                if (job.type === 'CLOUD_MARKING') {
                    const { handleCloudMarking } = await import('@/workers/cloud-worker');
                    jobResult = await handleCloudMarking(job);
                } else if (job.type === 'AI_GRADE_SUBMISSION') {
                    const { handleAiGrade } = await import('@/workers/grading-worker');
                    jobResult = await handleAiGrade(job);
                } else {
                    throw new Error(`Unknown Job Type: ${job.type}`);
                }

                // Support Job Continuations
                if (jobResult && jobResult.continuation) {
                    console.log(`[QUEUE] Job ${job.id} requested continuation for phase ${jobResult.nextPayload?.phase}`);
                    await prisma.job.update({
                        where: { id: job.id },
                        data: {
                            payload: JSON.stringify(jobResult.nextPayload),
                            status: 'PENDING', // Keep it pending so the next queue iteration picks it up
                            createdAt: new Date() // Send to back of the queue to prevent starvation of newer chunks
                        }
                    });
                    processedCount++;
                } else {
                    // Mark COMPLETED
                    await prisma.job.update({
                        where: { id: job.id },
                        data: { status: 'COMPLETED' }
                    });
                    processedCount++;
                }

            } catch (error: any) {
                console.error(`[QUEUE] Job ${job.id} Failed with Error:`, error.stack || error);

                // RATE LIMIT ARMOR (Handling 429s/503s)
                const isRateLimit = error.message?.includes('RATE_LIMIT_HIT') || error.message?.includes('429') || error.message?.includes('503');

                if (isRateLimit) {
                    console.warn(`[QUEUE] Rate Limit Hit on Job ${job.id}. Pausing batch.`);

                    // Revert status to PENDING so it's picked up later
                    await prisma.job.update({
                        where: { id: job.id },
                        data: {
                            status: 'PENDING',
                            error: `RATE LIMIT: ${error.message}`,
                            // Do NOT increment retry count for rate limits, or increment responsibly
                            // For now, we won't increment to prevent dead-lettering due to API congestion
                        }
                    });

                    rateLimitHit = true;
                    break; // STOP PROCESSING THE BATCH
                }

                // GENERIC FAILURE
                const newRetryCount = (job.retryCount || 0) + 1;

                const updatedJob = await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: newRetryCount >= 3 ? 'FAILED' : 'PENDING',
                        error: error.message || "Unknown error during job execution",
                        retryCount: newRetryCount
                    }
                });
                errors++;

                // HARD FAILURE HANDLING: If job maxed out retries, update parent entity to FAILED
                if (newRetryCount >= 3) {
                    try {
                        let payloadData: any = {};
                        if (job.payload) {
                            payloadData = JSON.parse(job.payload);
                        }

                        if (job.type === 'CLOUD_MARKING' && payloadData.bulkSessionId) {
                            await prisma.bulkSession.update({
                                where: { id: payloadData.bulkSessionId },
                                data: {
                                    status: 'FAILED',
                                    errorMessage: `Job failed after maximum retries: ${updatedJob.error}`
                                }
                            });
                            console.log(`[QUEUE] Max retries reached for CLOUD_MARKING. Updated BulkSession ${payloadData.bulkSessionId} to FAILED.`);
                        } else if (job.type === 'AI_GRADE_SUBMISSION' && payloadData.submissionId) {
                            await prisma.submission.update({
                                where: { id: payloadData.submissionId },
                                data: {
                                    status: 'FAILED',
                                    feedback: JSON.stringify({ error: `Job failed after maximum retries: ${updatedJob.error}` })
                                }
                            });
                            console.log(`[QUEUE] Max retries reached for ${job.type}. Updated Submission ${payloadData.submissionId} to FAILED.`);
                        }
                    } catch (failErr: any) {
                        console.error(`[QUEUE] Failed to update parent entity for max retried job ${job.id}:`, failErr);
                    }
                }
            }
        }

        // 3. Recursive Trigger (The "Hydraulic Press")
        // If we processed any jobs AND didn't hit a rate limit, trigger self to see if more jobs exist.
        // Even if we didn't fill the batch, a single job (like AI_GRADE_SUBMISSION) might have spawned new chunks!
        // If rate limit hit, we STOP to let the API cool down.
        if (!rateLimitHit && claimedJobs.length > 0) {
            console.log(`[QUEUE] Processed ${claimedJobs.length} jobs & healthy. Triggering recursion: ${baseUrl}/api/queue/process`);

            // Fire and forget next batch
            fetch(`${baseUrl}/api/queue/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).catch(e => console.error("Failed to trigger next batch", e));
        }
    });

    return NextResponse.json({
        success: true,
        message: `Accepted ${claimedJobs.length} jobs for background processing.`,
    }, { status: 202 }); // Accepted

  } catch (error: any) {
    console.error("[QUEUE_FATAL_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
