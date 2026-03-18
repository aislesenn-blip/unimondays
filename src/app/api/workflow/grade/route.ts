import { serve } from "@upstash/workflow/nextjs";
import { prisma } from '@/lib/prisma';
import { handleAiGradeWorkflow } from '@/workers/grading-worker';

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

    try {
      // 1. Mark as Processing
      await context.run("mark-processing", async () => {
        await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'PROCESSING' }
        });
      });

      // 2. Execute the Grading Workflow Steps
      // We pass the context to the worker so it can use context.run() internally
      await handleAiGradeWorkflow(context, submissionId);

      // 3. Mark as Completed (handled inside handleAiGradeWorkflow, but we can log it here)
      console.log(`[WORKFLOW] Successfully completed workflow for submission: ${submissionId}`);

    } catch (error: any) {
      console.error(`[WORKFLOW] Error for submission ${submissionId}:`, error);

      await context.run("mark-failed", async () => {
          await prisma.submission.update({
              where: { id: submissionId },
              data: {
                  status: 'FAILED',
                  feedback: error.message || 'System encountered a fatal error during grading.'
              }
          });
      });
    }
  }
);
