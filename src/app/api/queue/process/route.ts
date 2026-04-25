import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { prisma } from '@/lib/prisma';
import { handleAiGrade } from '@/workers/grading-worker';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ status: "Vercel OOM Protected Queue" });
}

const handler = async (req: NextRequest) => {
        try {
            const jobs = await prisma.job.findMany({
                where: { status: 'PENDING', OR: [{ retryCount: { lt: 3 } }, { retryCount: null }] },
                orderBy: { createdAt: 'asc' },
                take: 1
            });

            if (jobs.length === 0) return NextResponse.json({ processed: 0 });

            for (const job of jobs) {
                await prisma.job.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

                try {
                    if (job.type === 'AI_GRADE_SUBMISSION') await handleAiGrade(job);
                    await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED' } });
                } catch (err: any) {
                    const retryCount = (job.retryCount || 0) + 1;
                    const newStatus = retryCount >= 3 ? 'FAILED' : 'PENDING';

                    await prisma.job.update({
                        where: { id: job.id },
                        data: { status: newStatus, error: err.message, retryCount }
                    });

                    if (newStatus === 'FAILED' && job.payload) {
                        try {
                             const rawPayload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                             const actualPayload = rawPayload.payload ? rawPayload.payload : rawPayload;
                             const subId = actualPayload.submissionId;
                             if (subId) {
                                  await prisma.submission.update({
                                      where: { id: subId },
                                      data: { status: 'FAILED', feedback: 'System encountered a fatal error while grading.' }
                                  });
                             }
                        } catch (e) { /* silent */ }
                    }
                }
            }
            const remaining = await prisma.job.count({ where: { status: 'PENDING' } });
            return NextResponse.json({ processed: jobs.length, remaining });

        } catch (fatalError: any) {
            return NextResponse.json({ error: fatalError.message }, { status: 500 });
        }
    };

export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : handler;