import { NextRequest, NextResponse } from 'next/server';
import { enqueueJob } from '@/lib/queue';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await request.json();

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quizId' }, { status: 400 });
    }

    const job = await enqueueJob('EXPORT_ZIP', { quizId }, 5, quizId);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Export started.'
    });

  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
