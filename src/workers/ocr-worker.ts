import { Job } from '@prisma/client';
import { readFile } from '@/lib/storage';
import { splitPdfBatch } from '@/lib/pdf-service';
import { prisma } from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue';

export async function handleOcrSplit(job: Job) {
  let jobData: any;
  try {
     jobData = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
  } catch (e) {
     throw new Error("Invalid job payload JSON");
  }
  const { filePath, workSessionId } = jobData;

  if (!filePath || !workSessionId) {
    throw new Error("Missing filePath or workSessionId in job payload.");
  }

  // 1. Read file
  const buffer = await readFile(filePath);

  // 2. Split PDF
  const splits = await splitPdfBatch(buffer);

  const createdSubmissionIds: string[] = [];

  // 3. Create Submissions and Enqueue Grading
  for (const split of splits) {
    // Check if submission already exists for this student and workSession
    let submission = await prisma.submission.findFirst({
      where: {
        workSessionId,
        studentRegNo: split.regNo
      }
    });

    if (submission) {
      // Clear old score if exists
      await prisma.score.deleteMany({ where: { submissionId: submission.id } });

      // Update existing
      submission = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          filePath: split.filePath,
          status: 'PROCESSING',
          ocrText: null,
          submittedAt: new Date()
        }
      });
    } else {
      // Create new
      submission = await prisma.submission.create({
        data: {
          workSessionId,
          studentRegNo: split.regNo,
          filePath: split.filePath,
          status: 'PROCESSING'
        }
      });
    }

    if (submission) {
      // Enqueue Grading
      await enqueueJob('AI_GRADE', { submissionId: submission.id }, 0);
      createdSubmissionIds.push(submission.id);
    }
  }

  return {
    success: true,
    processed: splits.length,
    submissionIds: createdSubmissionIds
  };
}
