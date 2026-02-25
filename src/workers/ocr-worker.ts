import { Job } from '@prisma/client';
import { readFile } from '@/lib/storage';
import { splitPdfBatch } from '@/lib/pdf-service';
import { prisma } from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue';

export async function handleOcrSplit(job: Job) {
  const jobData = JSON.parse(job.data);
  const { filePath, quizId } = jobData;

  if (!filePath || !quizId) {
    throw new Error("Missing filePath or quizId in job data.");
  }

  // 1. Read file
  // Need to handle if file path is absolute or relative. readFile handles it.
  const buffer = await readFile(filePath);

  // 2. Split PDF
  // This uses Gemini to detect boundaries
  const splits = await splitPdfBatch(buffer);

  const createdSubmissionIds: number[] = [];

  // 3. Create Submissions and Enqueue Grading
  for (const split of splits) {
    // Check if submission already exists for this student and quiz
    let submission = await prisma.submission.findFirst({
      where: {
        quizId,
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
          status: 'PENDING_OCR',
          ocrText: null, // Reset OCR text
          submittedAt: new Date()
        }
      });
    } else {
      // Create new
      submission = await prisma.submission.create({
        data: {
          quizId,
          studentRegNo: split.regNo,
          filePath: split.filePath,
          status: 'PENDING_OCR'
        }
      });
    }

    if (submission) {
      // Enqueue Grading
      await enqueueJob('AI_GRADE', { submissionId: submission.id }, 0, quizId);
      createdSubmissionIds.push(submission.id);
    }
  }

  return {
    success: true,
    processed: splits.length,
    submissionIds: createdSubmissionIds
  };
}
