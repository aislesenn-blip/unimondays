import { prisma } from './prisma';
import { Job } from '@prisma/client';

export type JobType = 'OCR_SPLIT' | 'AI_GRADE' | 'EXPORT_ZIP';

export interface JobData {
  [key: string]: any;
}

export async function enqueueJob(type: JobType, data: JobData, priority: number = 0, quizId?: number): Promise<Job> {
  return await prisma.job.create({
    data: {
      type,
      data: JSON.stringify(data),
      status: 'PENDING',
      priority,
      quizId,
    },
  });
}

export async function claimJob(types: JobType[] = []): Promise<Job | null> {
  // Find a pending job
  // We use a transaction to ensure we don't pick the same job twice if multiple workers run
  // But Prisma doesn't support 'SKIP LOCKED' easily on SQLite.
  // We will use an optimistic approach: Find candidate, try to update status.

  const whereClause: any = {
    status: 'PENDING',
  };

  if (types.length > 0) {
    whereClause.type = { in: types };
  }

  // 1. Find a candidate (highest priority, oldest created)
  const candidate = await prisma.job.findFirst({
    where: whereClause,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  if (!candidate) return null;

  // 2. Try to claim it
  // We use updateMany to ensure we only update if it is still PENDING
  const { count } = await prisma.job.updateMany({
    where: {
      id: candidate.id,
      status: 'PENDING',
    },
    data: {
      status: 'PROCESSING',
      processedAt: new Date(),
    },
  });

  if (count === 0) {
    // Someone else claimed it, recurse (or return null to retry next loop)
    return null;
  }

  // Return the updated job
  return await prisma.job.findUnique({ where: { id: candidate.id } });
}

export async function completeJob(id: string, result: any): Promise<Job> {
  return await prisma.job.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      result: JSON.stringify(result),
    },
  });
}

export async function failJob(id: string, error: string): Promise<Job> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new Error(`Job ${id} not found`);

  // Simple retry logic: up to 3 attempts
  if (job.attempts < 3) {
    return await prisma.job.update({
      where: { id },
      data: {
        status: 'PENDING', // Re-queue
        attempts: { increment: 1 },
        error: error, // Log last error
      },
    });
  } else {
    return await prisma.job.update({
      where: { id },
      data: {
        status: 'FAILED',
        error: error,
      },
    });
  }
}

export async function getJobStatus(id: string): Promise<Job | null> {
  return await prisma.job.findUnique({ where: { id } });
}
