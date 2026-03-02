
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { performOcr } from "@/lib/ai/gemini";
import { gradeChunk } from "@/lib/ai/deepseek";
import { supabase } from "@/lib/supabase";

// Helper: Fire-and-forget Job Trigger
function triggerNextJob(jobId: string) {
  const queueProcessorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process`;
  console.log(`HYDRAULIC PRESS: Firing async trigger for job: ${jobId}`);
  fetch(queueProcessorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "some-secret",
    },
    body: JSON.stringify({ jobId }),
  }).catch(error => {
    console.error(`FATAL: Hydraulic press failed for job ${jobId}. Error:`, error);
  });
}

const jobSchema = z.object({ jobId: z.string() });

// The Main Queue Processor Endpoint
export async function POST(req: NextRequest) {
  // Authentication & Validation
  const internalSecret = req.headers.get("X-Internal-Secret");
  if (process.env.NODE_ENV === "production" && internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = jobSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { jobId } = validation.data;
  console.log(`QUEUE PROCESSOR: Received job: ${jobId}`);

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { submission: true } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Job Type Router
  switch (job.type) {
    case 'MAP_SUBMISSION':
      try {
        if (!job.submission || !job.submission.filePath) {
          throw new Error(`Job ${job.id} is missing submission data or filePath.`);
        }
        
        // LIVE: Fetch file from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(job.submission.filePath);
        if (downloadError) throw new Error(`Failed to download file from storage: ${downloadError.message}`);
        
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        
        // LIVE: Perform OCR with Gemini
        const ocrResult = await performOcr(fileBuffer, fileData.type);
        const textChunks = ocrResult.split('---PAGE_BREAK---'); // Assuming a simple page break marker
        const numChunks = textChunks.length;

        const childJobs = await prisma.$transaction(async (tx) => {
          const newChildJobs = [];
          for (let i = 0; i < numChunks; i++) {
            const childJob = await tx.job.create({
              data: {
                type: 'CHILD_TASK_GRADE_CHUNK',
                parentId: job.id,
                submissionId: job.submissionId,
                status: 'QUEUED',
                payload: JSON.stringify({
                  textChunk: textChunks[i],
                  pageNumber: i + 1,
                }),
              },
            });
            newChildJobs.push(childJob);
          }
          await tx.job.update({ where: { id: job.id }, data: { status: 'WAITING_FOR_CHILDREN', tasksTotal: numChunks } });
          return newChildJobs;
        });

        childJobs.forEach(child => triggerNextJob(child.id));
        return NextResponse.json({ success: true, message: `Fanned out to ${numChunks} jobs` });
      } catch (error: any) {
        await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED' } });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

    case 'CHILD_TASK_GRADE_CHUNK':
      try {
        const payload = JSON.parse(job.payload as string);
        if (!payload.textChunk) throw new Error(`Job ${job.id} missing textChunk.`);

        // LIVE: Fetch rubric
        const workSession = await prisma.workSession.findFirst({
            where: { submissions: { some: { id: job.submissionId! } } },
            include: { standardizedRubric: true }
        });

        if (!workSession || !workSession.standardizedRubric) {
            throw new Error(`Could not find a standardized rubric for submission ${job.submissionId}`);
        }

        const rubric = JSON.stringify(workSession.standardizedRubric);

        // LIVE: Grade with DeepSeek using the rubric
        const gradingResult = await gradeChunk(payload.textChunk, rubric);

        const reduceJob = await prisma.$transaction(async (tx) => {
          await tx.job.update({
            where: { id: job.id },
            data: { status: 'COMPLETED', result: JSON.stringify(gradingResult) }
          });
          const parentJob = await tx.job.update({
            where: { id: job.parentId! },
            data: { tasksCompleted: { increment: 1 } },
          });

          if (parentJob.tasksCompleted === parentJob.tasksTotal) {
            const newReduceJob = await tx.job.create({
              data: {
                type: 'REDUCE_GRADES',
                parentId: parentJob.id,
                submissionId: parentJob.submissionId,
                status: 'QUEUED',
                payload: '{}',
              },
            });
            return newReduceJob;
          }
          return null;
        });

        if (reduceJob) {
          triggerNextJob(reduceJob.id);
        }

        return NextResponse.json({ success: true });
      } catch (error: any) {
        await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED' } });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

    case 'REDUCE_GRADES':
      try {
        const childJobs = await prisma.job.findMany({ where: { parentId: job.parentId, type: 'CHILD_TASK_GRADE_CHUNK' } });
        let finalScore = 0;
        let combinedFeedback = "";

        for (const child of childJobs) {
          const result = JSON.parse(child.result as string);
          const payload = JSON.parse(child.payload as string);
          finalScore += result?.score || 0;
          combinedFeedback += `Page ${payload.pageNumber}: ${result?.feedback || 'No feedback provided.'}\n`;
        }

        await prisma.$transaction(async (tx) => {
          await tx.score.create({ data: { submissionId: job.submissionId!, totalMarks: finalScore, breakdown: JSON.stringify({ feedback: combinedFeedback }) } });
          await tx.submission.update({ where: { id: job.submissionId! }, data: { status: 'COMPLETED' } });
          await tx.job.update({ where: { id: job.parentId! }, data: { status: 'COMPLETED' } });
          await tx.job.update({ where: { id: job.id }, data: { status: 'COMPLETED' } });
        });

        return NextResponse.json({ success: true });
      } catch (error: any) {
        await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED' } });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

    default:
      return NextResponse.json({ error: `Unknown job type: ${job.type}` }, { status: 400 });
  }
}
