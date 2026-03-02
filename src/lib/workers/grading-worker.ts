
// src/lib/workers/grading-worker.ts
import prisma from "@/lib/db"; // Correct: Use the centralized, Data Proxy-enabled client
import { Job, JobType, JobStatus, GradingStatus } from "@prisma/client";
import { performOcr } from "@/lib/ai/gemini";
import { gradeChunk, identifyStudent } from "@/lib/ai/deepseek";
import { enqueueJob } from "@/lib/queue";

// A helper function to split a large document into manageable chunks
const splitIntoChunks = (text: string, chunkSize = 8000) => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

interface WorkerOptions {
  isLastAttempt: boolean;
}

// Main Worker Logic: Routes a job to the correct handler based on its type
export async function gradingWorker(jobId: string, options: WorkerOptions): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    console.error(`Job with ID ${jobId} not found.`);
    return;
  }

  await updateJobStatus(jobId, JobStatus.IN_PROGRESS);

  try {
    switch (job.type) {
      case JobType.MAP_SUBMISSION:
        await handleMapSubmission(job);
        break;
      case JobType.CHILD_TASK_OCR:
        await handleOcrTask(job);
        break;
      case JobType.CHILD_TASK_IDENTIFY_STUDENT:
        await handleIdentifyStudentTask(job);
        break;
      case JobType.CHILD_TASK_GRADE_CHUNK:
        await handleGradeChunkTask(job);
        break;
      case JobType.REDUCE_GRADES:
        await handleReduceGrades(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    await updateJobStatus(jobId, JobStatus.COMPLETED);
  } catch (error: any) {
    console.error(`Error processing job ${jobId}:`, error.message);
    
    if (options.isLastAttempt) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.FAILED, error: error.message },
      });
      if (job.submissionId) {
        await prisma.submission.update({
          where: { id: job.submissionId },
          data: { gradingStatus: GradingStatus.FAILED },
        });
      }
    } else {
        console.log(`Job ${jobId} failed, but will be retried. Not marking as FAILED in DB.`);
    }
    throw error; 
  }
}

// == MAP PHASE HANDLERS ==

async function handleMapSubmission(job: Job) {
  const { submissionId, filePath } = JSON.parse(job.payload);
  await createChildJob(job, JobType.CHILD_TASK_OCR, { filePath });
  await prisma.submission.update({ 
    where: { id: submissionId },
    data: { gradingStatus: GradingStatus.MAPPING }
  });
}

async function handleOcrTask(job: Job) {
  if (!job.parentId || !job.submissionId) throw new Error("OCR task is missing parent/submission context.");

  const { filePath } = JSON.parse(job.payload);
  const ocrText = await performOcr(filePath);

  await prisma.submission.update({ 
    where: { id: job.submissionId }, 
    data: { ocrText }
  });

  const chunks = splitIntoChunks(ocrText);
  
  const childJobs: Promise<any>[] = [];
  childJobs.push(createChildJob(job, JobType.CHILD_TASK_IDENTIFY_STUDENT, { chunk: chunks[0] }));
  chunks.forEach((chunk, index) => {
    childJobs.push(createChildJob(job, JobType.CHILD_TASK_GRADE_CHUNK, { chunk, index }));
  });
  childJobs.push(createChildJob(job, JobType.REDUCE_GRADES, {}));

  const parentJob = await prisma.job.findUnique({ where: { id: job.parentId }});
  await prisma.job.update({
    where: { id: job.parentId },
    data: { 
      status: JobStatus.WAITING_FOR_CHILDREN, 
      tasksTotal: (parentJob?.tasksTotal ?? 0) + chunks.length + 1
    },
  });

  await Promise.all(childJobs);
}

async function handleIdentifyStudentTask(job: Job) {
    if (!job.parentId || !job.submissionId) throw new Error("Identify student task is missing parent/submission context.");

    const { chunk } = JSON.parse(job.payload);
    const workSession = await getWorkSessionFromSubmission(job.submissionId);

    const identity = await identifyStudent(chunk, workSession.class?.id);
    
    await prisma.submission.update({
        where: { id: job.submissionId },
        data: {
            studentName: identity.studentName,
            studentRegNo: identity.studentRegNo,
        }
    });
    
    await saveJobResult(job.id, { identifiedStudent: identity });
    await incrementParentTaskCount(job.parentId);
}

async function handleGradeChunkTask(job: Job) {
  if (!job.parentId || !job.submissionId) throw new Error("Grade chunk task is missing parent/submission context.");

  const { chunk, index } = JSON.parse(job.payload);
  const workSession = await getWorkSessionFromSubmission(job.submissionId);

  if (!workSession.rubric) throw new Error(`Work session ${workSession.id} has no rubric.`);

  const gradingResult = await gradeChunk(chunk, workSession.rubric);

  await saveJobResult(job.id, { index, gradingResult });
  await incrementParentTaskCount(job.parentId);
}

// == REDUCE PHASE HANDLER ==

async function handleReduceGrades(job: Job) {
  if (!job.parentId || !job.submissionId) throw new Error("Reduce task is missing parent/submission context.");

  const parentJob = await prisma.job.findUnique({ 
    where: { id: job.parentId },
    include: { children: true }
  });

  if (!parentJob) throw new Error("Parent job not found for reduction.");

  const gradeChunkJobs = parentJob.children.filter(c => c.type === JobType.CHILD_TASK_GRADE_CHUNK && c.status === JobStatus.COMPLETED);

  const finalBreakdown = {};
  let totalMarks = 0;

  for (const chunkJob of gradeChunkJobs) {
    const result = JSON.parse(chunkJob.result || '{}');
  }

  await prisma.score.create({
    data: {
      submissionId: job.submissionId,
      totalMarks,
      breakdown: JSON.stringify(finalBreakdown),
      remarks: "Aggregated from automated grading.",
    },
  });

  await prisma.submission.update({ 
    where: { id: job.submissionId }, 
    data: { gradingStatus: GradingStatus.COMPLETED, status: 'GRADED' }
  });

  await saveJobResult(job.id, { totalMarks, finalBreakdown });
}

// == UTILITY FUNCTIONS ==

const updateJobStatus = (jobId: string, status: JobStatus) => {
  return prisma.job.update({ where: { id: jobId }, data: { status } });
};

const saveJobResult = (jobId: string, result: any) => {
    return prisma.job.update({
        where: { id: jobId },
        data: { result: JSON.stringify(result) },
    });
}

const createChildJob = async (parentJob: Job, type: JobType, payload: object) => {
    if (!parentJob.submissionId) {
        throw new Error(`Parent job ${parentJob.id} is missing a submissionId.`);
    }
    const job = await prisma.job.create({
        data: {
            type,
            status: JobStatus.PENDING,
            payload: JSON.stringify(payload),
            parentId: parentJob.id,
            submissionId: parentJob.submissionId,
        },
    });
    await enqueueJob(job.id);
    return job;
};

const incrementParentTaskCount = async (parentId: string) => {
    const parent = await prisma.job.update({
        where: { id: parentId },
        data: { tasksCompleted: { increment: 1 } },
    });

    if (parent.tasksCompleted === parent.tasksTotal) {
        const reducerJob = await prisma.job.findFirst({
            where: {
                parentId: parentId,
                type: JobType.REDUCE_GRADES,
            },
        });
        if (reducerJob) {
            await updateJobStatus(reducerJob.id, JobStatus.PENDING);
            await enqueueJob(reducerJob.id);
            await prisma.submission.update({ 
              where: { id: parent.submissionId! }, 
              data: { gradingStatus: GradingStatus.REDUCING }
            });
        }
    }
};

async function getWorkSessionFromSubmission(submissionId: string) {
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { workSession: { include: { class: true } } },
    });
    if (!submission) throw new Error(`Submission ${submissionId} not found.`);
    return submission.workSession;
}
