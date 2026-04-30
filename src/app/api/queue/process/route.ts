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

        // Distributed Lock: Ensure only one queue worker is processing to guarantee "one student at a time"
        const activeJobsCount = await prisma.job.count({
            where: { status: 'PROCESSING', type: { in: ['AI_GRADE_SUBMISSION', 'AI_GRADE'] } }
        });

        if (activeJobsCount >= 1) {
            console.log(`[QUEUE_PROCESSOR] A queue worker is already active. Exiting to maintain sequential processing.`);
            return NextResponse.json({ success: true, message: "Queue is already processing jobs sequentially.", processed: 0 });
        }

        console.log(`[QUEUE_PROCESSOR] Started Sequential Queue Processing...`);

        // Get the host for recursive calls
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Process exactly 1 job at a time per explicit constraint
        const BATCH_SIZE = 1;
        const processingPromises = [];

        for (let i = 0; i < BATCH_SIZE; i++) {
            processingPromises.push(processNextJob(baseUrl));
        }

        const results = await Promise.all(processingPromises);

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
