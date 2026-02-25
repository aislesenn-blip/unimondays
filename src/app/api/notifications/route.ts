import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch recent audit logs targeting this user
  // Or system wide alerts if admin?
  // For now, user specific.
  const notifications = await prisma.auditLog.findMany({
    where: {
      userId: user.id,
      // Filter strictly for notification-worthy actions?
      action: { in: ['GRADED', 'FLAGGED', 'LATE', 'MISSING', 'ASSIGNMENT_POSTED'] }
    },
    orderBy: { timestamp: 'desc' },
    take: 10
  });

  return NextResponse.json(notifications);
}
