import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { after } from 'next/server';

export const maxDuration = 300; // 5 Minutes (Vercel Pro/Enterprise)
export const dynamic = 'force-dynamic'; // Disable caching

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow lenient triggering for Student Submit flow
  }

  // Acknowledge the webhook immediately to prevent client timeouts (Vercel Gateway Timeout)
  console.log(`[QUEUE_WAKEUP] Received trigger at ${new Date().toISOString()}. Detaching execution...`);

  after(async () => {
    let processedCount = 0;
    let errors = 0;
    let rateLimitHit = false;

    try {
      // 1. Fetch & Claim Pending Jobs (Atomic Claim Mechanism to prevent race conditions)
      // We process strictly up to 2 at a time to avoid Vercel timeouts (BATCH_SIZE = 2)
      const BATCH_SIZE = 2;
      const claimedJobs = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
          // Find the oldest pending job
          // FIX: Handle Prisma inequality on optional fields. Include { retryCount: null } explicitly.
          const job = await prisma.job.findFirst({
              where: {
                  status: 'PENDING',
                  type: { in: ['AI_GRADE_SUBMISSION', 'CLOUD_MARKING', 'AI_GRADE_CHUNK', 'AI_GRADE_AGGREGATE'] },
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
          console.log('[QUEUE] No pending jobs found or all claimed by other workers.');
          return;
      }

      console.log(`[QUEUE] Successfully claimed and processing ${claimedJobs.length} jobs...`);

      // 2. Process Jobs (SERIAL EXECUTION)
      for (const job of claimedJobs) {
          try {
              // EXECUTE WORKER BASED ON TYPE
              // FIX: Conditionally lazy-load massive worker modules to avoid Vercel's 50MB function limit
              let jobResult: any = null;

              if (job.type === 'CLOUD_MARKING') {
                  const { handleCloudMarking } = await import('@/workers/cloud-worker');
                  jobResult = await handleCloudMarking(job);
              } else if (job.type === 'AI_GRADE_SUBMISSION' || job.type === 'AI_GRADE_CHUNK' || job.type === 'AI_GRADE_AGGREGATE') {
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
                          status: 'PENDING' // Keep it pending so the next queue iteration picks it up
                      }
                  });
                  processedCount++;
              } else {
                  // Mark COMPLETED
                  await prisma.job.update({
                      where: { id: job.id },
                      data: { status: 'COMPLETED', result: 'Success' }
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
                      }
                  });

                  rateLimitHit = true;
                  break; // STOP PROCESSING THE BATCH
              }

              // GENERIC FAILURE
              // FIX: Transient Failure State Management. If retries < 3, revert to PENDING, else hard FAILED.
              const currentRetries = job.retryCount ?? 0;
              const nextStatus = currentRetries + 1 < 3 ? 'PENDING' : 'FAILED';

              await prisma.job.update({
                  where: { id: job.id },
                  data: {
                      status: nextStatus,
                      error: error.message || "Unknown error during job execution",
                      retryCount: { increment: 1 }
                  }
              });
              errors++;
          }
      }

      // 3. Recursive Trigger (The "Hydraulic Press")
      // If we processed a full batch successfully AND didn't hit a rate limit, trigger self.
      if (!rateLimitHit && claimedJobs.length === BATCH_SIZE) {
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const host = req.headers.get('host');
          const baseUrl = `${protocol}://${host}`;

          console.log(`[QUEUE] Batch full & healthy. Triggering recursion: ${baseUrl}/api/queue/process`);

          // Fire and forget next batch
          fetch(`${baseUrl}/api/queue/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
          }).catch(e => console.error("Failed to trigger next batch", e));
      }

      console.log(`[QUEUE_DONE] Processed ${processedCount} jobs. ${errors} failed. Rate Limit: ${rateLimitHit}`);

    } catch (error: any) {
      console.error("[QUEUE_FATAL_ERROR] Critical Failure:", error);
    }
  }); // End after()

  return NextResponse.json({ success: true, message: 'Queue processing started in background' });
}
