import { NextRequest, NextResponse } from 'next/server';
import { handleAiGrade } from '@/workers/grading-worker';
import { prisma } from '@/lib/prisma';

export const maxDuration = 300; // Allow 5 minutes for AI grading (increased from 60s)

export async function POST(req: NextRequest) {
  let submissionId: string | null = null;

  try {
    const body = await req.json();
    submissionId = body.submissionId;

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

    // FAIL-SAFE: Update DB status if we have an ID
    if (submissionId) {
        try {
            await prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: 'FAILED',
                    feedback: JSON.stringify({ error: `System Failure: ${error.message || 'Unknown Error'}` })
                }
            });
            console.log(`[WEBHOOK] Fail-Safe: Updated Submission ${submissionId} to FAILED.`);
        } catch (dbError) {
            console.error("[WEBHOOK] Critical: Failed to update status to FAILED", dbError);
        }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
