import { prisma } from '@/lib/prisma';
import { claimJob, completeJob, failJob, JobData, JobType } from '@/lib/queue';
import { Job } from '@prisma/client';
import { handleOcrSplit } from './ocr-worker';
import { handleAiGrade } from './grading-worker';
import { handleExportZip } from './export-worker';

// Handlers interface
type JobHandler = (job: Job) => Promise<any>;

// Map job types to handlers
const handlers: Record<string, JobHandler> = {
  'OCR_SPLIT': handleOcrSplit,
  'AI_GRADE': handleAiGrade,
  'EXPORT_ZIP': handleExportZip
};

export async function processJobs() {
  console.log("Worker started...");
  while (true) {
    try {
      // 1. Claim a job
      const jobTypeKeys = Object.keys(handlers) as JobType[];
      const job = await claimJob(jobTypeKeys);

      if (job) {
        console.log(`Claimed job ${job.id} (${job.type})`);

        try {
          const handler = handlers[job.type];
          if (!handler) throw new Error(`No handler for job type ${job.type}`);

          const result = await handler(job);
          await completeJob(job.id, result);
          console.log(`Completed job ${job.id}`);
        } catch (error: any) {
          console.error(`Job ${job.id} failed:`, error);
          await failJob(job.id, error.message || String(error));
        }
      } else {
        // No job found, sleep for a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Worker loop error:", error);
      // Sleep to prevent tight loop on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
