import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleAiGrade } from '@/workers/grading-worker';

export const maxDuration = 300; // 5 min
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ status: "Vercel OOM Protected Queue" });
}

export async function POST() {
    console.log("[QUEUE] Wakeup: Project 1000 - Sequential Mode");

    try {
        // STRICT LIMIT 1 (Never exceed or lambda dies)
        const jobs = await prisma.job.findMany({
            where: { status: 'PENDING' },
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

                // Fallback to PENDING for 3 retries
                const retryCount = (job.retryCount || 0) + 1;
                const newStatus = retryCount >= 3 ? 'FAILED' : 'PENDING';

                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: newStatus, error: err.message, retryCount }
                });
            }
        }

        console.log("[QUEUE] Batch Complete.");

        const remaining = await prisma.job.count({ where: { status: 'PENDING' } });

        return NextResponse.json({ processed: jobs.length, remaining });

    } catch (fatalError: any) {
        console.error("[QUEUE] FATAL ERROR", fatalError);
        return NextResponse.json({ error: fatalError.message }, { status: 500 });
    }
}