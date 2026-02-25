import { Job } from '@prisma/client';
import { readFile } from '@/lib/storage';
import { splitPdfBatch } from '@/lib/pdf-service';
import { prisma } from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue';

export async function handleOcrSplit(job: Job) {
  const jobData = job.payload as any;
  const { filePath, quizId } = jobData;

  if (!filePath || !quizId) {
    throw new Error("Missing filePath or quizId in job payload.");
  }

  // 1. Read file
  const buffer = await readFile(filePath);

  // 2. Split PDF
  const splits = await splitPdfBatch(buffer);

  const createdSubmissionIds: string[] = [];

  // 3. Create Submissions and Enqueue Grading
  for (const split of splits) {
    // Check if submission already exists for this student and quiz
    // Use studentRegNo for matching
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
          status: 'PROCESSING', // PENDING_OCR mapped to PROCESSING
          ocrText: null, // Reset OCR text
          submittedAt: new Date()
        }
      });
    } else {
      // Create new
      // Submission requires universityId. Use job's universityId.
      if (!job.universityId) {
          // Try to fetch from quiz
          const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
          if (!quiz) throw new Error("Quiz not found to infer University ID");

          submission = await prisma.submission.create({
            data: {
              quizId,
              universityId: quiz.universityId,
              studentRegNo: split.regNo,
              filePath: split.filePath,
              status: 'PROCESSING'
            }
          });
      } else {
          submission = await prisma.submission.create({
            data: {
              quizId,
              universityId: job.universityId,
              studentRegNo: split.regNo,
              filePath: split.filePath,
              status: 'PROCESSING'
            }
          });
      }
    }

    if (submission) {
      // Enqueue Grading
      await enqueueJob('AI_GRADE', { submissionId: submission.id }, 0, undefined, job.universityId || undefined);
      createdSubmissionIds.push(submission.id);
    }
  }

  return {
    success: true,
    processed: splits.length,
    submissionIds: createdSubmissionIds
  };
}
