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

       let submissionId: string | undefined;

       // Fallback to requestPayload
       if (context?.requestPayload) {
          if (typeof context.requestPayload === 'string') {
              try {
                 const parsed = JSON.parse(context.requestPayload);
                 submissionId = parsed.submissionId;
              } catch (e) {}
          } else {
              submissionId = (context.requestPayload as any).submissionId;
          }
       }

       // Note: Depending on Upstash configuration, requestPayload might be inaccessible in failure blocks
       // dynamically. If this fails, consider passing headers manually or resolving upstream logs.

       if (submissionId) {
          try {
             const { prisma } = await import('@/lib/prisma');
             await prisma.submission.update({
                  where: { id: submissionId },
                  data: {
                      status: 'FAILED',
                      feedback: 'System encountered a fatal error during grading. Please try again.'
                  }
              });
          } catch (e) {
             console.error("Failed to update status on workflow failure", e);
          }
       } else {
          console.error("Workflow failed, but unable to extract submissionId to update DB state.");
       }
    }
  }
);
