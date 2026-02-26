import { NextRequest, NextResponse } from 'next/server';
import { handleAiGrade } from '@/workers/grading-worker';

export const maxDuration = 300; // Allow 5 minutes for AI grading (increased from 60s)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    console.log(`[WEBHOOK] Triggering AI Grading for Submission ${submissionId}`);

    // Call the worker logic directly
    // Note: In a real background job system, we'd use a queue.
    // Here we run it in the request handler but with extended timeout.
    // The client (submit route) should fire-and-forget this call.

    // We construct a mock Job object since handleAiGrade expects one
    const mockJob: any = {
        id: `webhook-${Date.now()}`,
        payload: JSON.stringify({ submissionId }),
        type: 'AI_GRADE',
        status: 'PENDING'
    };

    const result = await handleAiGrade(mockJob);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[WEBHOOK] Grading Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
