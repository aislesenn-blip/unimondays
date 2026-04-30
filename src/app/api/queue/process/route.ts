import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { claimJob, completeJob, failJob } from '@/lib/queue';
import { waitUntil } from '@vercel/functions';

// Force dynamic and set high timeout (5 minutes)
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        // Authenticate the caller securely
        const authHeader = req.headers.get('authorization');
        const internalKey = process.env.INTERNAL_API_KEY;

        // If INTERNAL_API_KEY is not configured or the header does not match, check session
        if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
            const user = await getAuthenticatedUser();
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // Prevent concurrent queue workers from starting at the exact same millisecond.
        // In a true enterprise setup this would be an SQS queue or a Redis lock.
        // For Postgres, we randomly stagger the workers to reduce race conditions on job claiming.
        const staggerDelay = Math.floor(Math.random() * 500);
        await new Promise(resolve => setTimeout(resolve, staggerDelay));

        // Get the host for recursive calls
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // The claimJob function itself acts as an atomic lock via UPDATE ... WHERE status = 'PENDING'
        // If 1000 requests hit, only the one that successfully claims a job will process it.
        // The others will get null and exit.

        console.log(`[QUEUE_PROCESSOR] Started Queue Worker...`);

        const results = [];

        // Loop sequentially to process jobs until the queue is empty
        // BATCH_SIZE essentially means how many jobs THIS specific worker will process
        // before dying to prevent Vercel 5 min timeout.
        const BATCH_SIZE = 5;

        for (let i = 0; i < BATCH_SIZE; i++) {
            const success = await processNextJob(baseUrl);
            results.push(success);
            if (!success) break; // If claimJob returned null, the queue is empty
        }

        // Count how many jobs were actually processed
        const jobsProcessed = results.filter(r => r === true).length;

        console.log(`[QUEUE_PROCESSOR] Finished Batch. Processed ${jobsProcessed} jobs.`);

        // If we processed a job, trigger the next one recursively safely
        if (jobsProcessed > 0) {
            console.log(`[QUEUE_PROCESSOR] Triggering next job recursively...`);
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
                        console.error("Recursive queue trigger failed:", e);
                    }
                })()
            );
        }

        return NextResponse.json({ success: true, processed: jobsProcessed });

    } catch (error: any) {
        console.error("[QUEUE_PROCESSOR] Critical Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function processNextJob(baseUrl: string): Promise<boolean> {
    try {
        // Claim a job that is PENDING
        const job = await claimJob(['AI_GRADE_SUBMISSION', 'AI_GRADE']); // Added both types just in case

        if (!job) {
            return false; // No jobs available
        }

        console.log(`[QUEUE_PROCESSOR] Claimed Job ${job.id} of type ${job.type}`);

        const payload = JSON.parse(job.payload);
        const { submissionId } = payload;

        if (!submissionId) {
            throw new Error("Job payload missing submissionId");
        }

        // Call the actual grading stream API (synchronously waiting for it to finish for this job)
        // This keeps the heavy LLM logic in grade/stream but manages concurrency here.
        const res = await fetch(`${baseUrl}/api/grade/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || ''}`
            },
            body: JSON.stringify({ submissionId }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Grading API failed: ${res.status} ${errorText}`);
        }

        const resultData = await res.json();

        // Mark Job as Completed
        await completeJob(job.id, resultData);
        console.log(`[QUEUE_PROCESSOR] Successfully completed Job ${job.id}`);
        return true;

    } catch (error: any) {
        console.error(`[QUEUE_PROCESSOR] Job failed:`, error);
        // Job failure logic handled internally, if error throw it so claimJob fails
        return false;
    }
}
