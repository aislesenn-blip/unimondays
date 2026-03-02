
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Helper: OCR Simulation
async function performOcrAndSplit(filePath: string): Promise<string[]> {
  console.log(`AI WORKER: Performing OCR on ${filePath}.`);
  const mockOcrResult = `This is the extracted text from page 1.\n---PAGE_BREAK---\nThis is the extracted text from page 2.\n---PAGE_BREAK---\nThis is the extracted text from page 3.`;
  await new Promise(resolve => setTimeout(resolve, 1500));
  return mockOcrResult.split('---PAGE_BREAK---');
}

// Helper: Grading Simulation
async function gradeChunkWithDeepSeek(textChunk: string): Promise<any> {
  console.log(`AI GRADER: Grading chunk with DeepSeek...`);
  const mockApiResponse = `Of course! Here is the JSON: {\"score\": 85, \"feedback\": \"Well-written but needs more examples.\"}`;
  await new Promise(resolve => setTimeout(resolve, 2000));
  const jsonMatch = mockApiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from AI.");
  return JSON.parse(jsonMatch[0]);
}

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
        const textChunks = await performOcrAndSplit(job.submission.filePath);
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

        const gradingResult = await gradeChunkWithDeepSeek(payload.textChunk);

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
                payload: '{}', // Add empty payload to satisfy schema
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
          combinedFeedback += `Page ${payload.pageNumber}: ${result?.feedback}\n`;
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
