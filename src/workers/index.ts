import { prisma } from '@/lib/prisma';
import { claimJob, completeJob, failJob, JobType } from '@/lib/queue';
import { Job } from '@prisma/client';
import { handleOcrSplit } from './ocr-worker';
// handleAiGrade migrated to native Upstash Workflow endpoint at /api/workflow/grade
import { handleExportZip } from './export-worker';

// Handlers interface
type JobHandler = (job: Job) => Promise<any>;

// Map job types to handlers
const handlers: Record<string, JobHandler> = {
  'OCR_SPLIT': handleOcrSplit,
  'AI_GRADE': async (job: Job) => { console.warn("Job handler replaced by Upstash Workflow. Skipping legacy call.") },
  'EXPORT_ZIP': handleExportZip
};

export async function processJobs() {
  console.log("Worker started. Monitoring queue...");

  // Basic metrics
  let processedCount = 0;
  let errorCount = 0;

  while (true) {
    try {
      // 1. Claim a job
      const jobTypeKeys = Object.keys(handlers) as JobType[];
      const job = await claimJob(jobTypeKeys);

      if (job) {
        const startTime = Date.now();
        console.log(JSON.stringify({
          event: "JOB_STARTED",
          jobId: job.id,
          type: job.type,
          timestamp: new Date().toISOString()
        }));

        try {
          const handler = handlers[job.type];
          if (!handler) throw new Error(`No handler for job type ${job.type}`);

          const result = await handler(job);
          await completeJob(job.id, result);

          const duration = Date.now() - startTime;
          console.log(JSON.stringify({
            event: "JOB_COMPLETED",
            jobId: job.id,
            duration,
            timestamp: new Date().toISOString()
          }));
          processedCount++;
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error(JSON.stringify({
            event: "JOB_FAILED",
            jobId: job.id,
            error: error.message || String(error),
            duration,
            timestamp: new Date().toISOString()
          }));
          await failJob(job.id, error.message || String(error));
          errorCount++;
        }
      } else {
        // No job found, sleep for a bit (Exponential backoff could be added here)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Worker loop fatal error:", error);
      // Sleep to prevent tight loop on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
