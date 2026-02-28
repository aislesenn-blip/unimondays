import { prisma } from './prisma';
import { Job } from '@prisma/client';

export type JobType = 'OCR_SPLIT' | 'AI_GRADE' | 'EXPORT_ZIP' | 'AI_GRADE_SUBMISSION' | 'AI_GRADE_CHUNK' | 'AI_GRADE_AGGREGATE';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobPayload {
  [key: string]: any;
}

export async function enqueueJob(type: string, payload: JobPayload, priority: number = 0): Promise<Job> {
  // priority is ignored
  const payloadStr = JSON.stringify(payload);
  return await prisma.job.create({
    data: {
      type,
      payload: payloadStr,
      status: 'PENDING',
    },
  });
}

export async function claimJob(types: string[] = []): Promise<Job | null> {
  const whereClause: any = {
    status: 'PENDING',
  };

  if (types.length > 0) {
    whereClause.type = { in: types };
  }

  // 1. Find a candidate (oldest created)
  const candidate = await prisma.job.findFirst({
    where: whereClause,
    orderBy: [
      { createdAt: 'asc' },
    ],
  });

  if (!candidate) return null;

  // 2. Try to claim it
  const { count } = await prisma.job.updateMany({
    where: {
      id: candidate.id,
      status: 'PENDING',
    },
    data: {
      status: 'PROCESSING',
      processedAt: new Date(),
      retryCount: { increment: 1 }
    },
  });

  if (count === 0) {
    return null;
  }

  return await prisma.job.findUnique({ where: { id: candidate.id } });
}

export async function completeJob(id: string, result: any): Promise<Job> {
  const resultStr = JSON.stringify(result);
  return await prisma.job.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      result: resultStr,
      processedAt: new Date()
    },
  });
}

export async function failJob(id: string, error: string): Promise<Job> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new Error(`Job ${id} not found`);

  // Retry logic: up to 3 attempts
  if ((job.retryCount || 0) < 3) {
    return await prisma.job.update({
      where: { id },
      data: {
        status: 'PENDING', // Re-queue
        error: error,
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
