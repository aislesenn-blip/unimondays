import { serve } from "@upstash/workflow/nextjs";
import { prisma } from '@/lib/prisma';
import { handleAiGradeWorkflow } from '@/workers/grading-worker';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export const { POST } = serve(
  async (context) => {
    const payload = context.requestPayload;

    // We expect the payload to contain the submissionId
    const { submissionId } = payload as { submissionId: string };

    if (!submissionId) {
      console.error("[WORKFLOW] Missing submissionId in payload");
      return;
    }

    console.log(`[WORKFLOW] Started workflow for submission: ${submissionId}`);

    // 1. Mark as Processing
    await context.run("mark-processing", async () => {
      await prisma.submission.update({
          where: { id: submissionId },
          data: { status: 'PROCESSING' }
      });
    });

    // 2. Execute the Grading Workflow Steps
    // We pass the context to the worker so it can use context.run() internally
    // Note: Do NOT wrap context.run in try/catch. Upstash throws WorkflowAbort internally.
    await handleAiGradeWorkflow(context, submissionId);

    // 3. Mark as Completed (handled inside handleAiGradeWorkflow, but we can log it here)
    console.log(`[WORKFLOW] Successfully completed workflow for submission: ${submissionId}`);
  },
  {
    failureFunction: async ({ context, failStatus, failResponse }) => {
       console.error("Workflow failed:", failResponse);
       const payload = context.requestPayload as { submissionId?: string };
       if (payload?.submissionId) {
          try {
             // We can't use prisma here cleanly if it's an edge function,
             // but assuming it's standard node we can update it.
             const { prisma } = await import('@/lib/prisma');
             await prisma.submission.update({
                  where: { id: payload.submissionId },
                  data: {
                      status: 'FAILED',
                      feedback: 'System encountered a fatal error during grading. Please try again.'
                  }
              });
          } catch (e) {
             console.error("Failed to update status on workflow failure", e);
          }
       }
    }
  }
);
