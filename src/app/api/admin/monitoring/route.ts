import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await validateRequest(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Basic stats
  const [
    totalJobs,
    pendingJobs,
    processingJobs,
    failedJobs,
    completedJobs,
    recentAudits
  ] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: 'PENDING' } }),
    prisma.job.count({ where: { status: 'PROCESSING' } }),
    prisma.job.count({ where: { status: 'FAILED' } }),
    prisma.job.count({ where: { status: 'COMPLETED' } }),
    prisma.auditLog.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' }
    })
  ]);

  // Average processing time (approximate)
  // This would be better with aggregate query on processedAt - createdAt
  // but processedAt is completion time in my schema? Or start time?
  // Schema: processedAt DateTime?
  // Usually processedAt means "when it was picked up".
  // UpdatedAt is "when it finished" (if COMPLETED).

  return NextResponse.json({
    queue: {
      total: totalJobs,
      pending: pendingJobs,
      processing: processingJobs,
      failed: failedJobs,
      completed: completedJobs
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      load: process.cpuUsage()
    },
    recentAudits
  });
}
