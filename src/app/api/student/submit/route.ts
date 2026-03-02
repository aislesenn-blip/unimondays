
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const submissionSchema = z.object({
  workSessionId: z.string(),
  studentId: z.string(),
});

function triggerNextJob(jobId: string) {
  const queueProcessorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process`;
  console.log(`Firing async trigger for new submission job: ${jobId}`);
  fetch(queueProcessorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "some-secret",
    },
    body: JSON.stringify({ jobId }),
  }).catch(error => {
    // This is critical for debugging - if the trigger fails, we need to know why.
    console.error(`FATAL: Failed to trigger job for ${jobId}. This submission is now orphaned. Error:`, error);
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const scriptFile = formData.get("scriptFile") as File;
  const workSessionId = formData.get("workSessionId") as string;
  const studentId = formData.get("studentId") as string;

  if (!scriptFile) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const validation = submissionSchema.safeParse({ workSessionId, studentId });
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid input.", details: validation.error.flatten() }, { status: 400 });
  }

  try {
    // 1. Upload file to blob storage
    const blob = await put(scriptFile.name, scriptFile, {
      access: 'public',
    });

    // 2. Create Submission and Job records in a single transaction
    const { job, submission } = await prisma.$transaction(async (tx) => {
      const displayId = `SUB-${Date.now().toString().slice(-6)}`;
      const newSubmission = await tx.submission.create({
        data: {
          workSessionId: validation.data.workSessionId,
          userId: validation.data.studentId,
          filePath: blob.url, // Save the blob URL
          status: 'QUEUED',
          studentRegNo: displayId,
        }
      });

      const newJob = await tx.job.create({
        data: {
          type: 'MAP_SUBMISSION',
          submissionId: newSubmission.id,
          status: 'QUEUED',
          payload: '{}',
        }
      });

      return { job: newJob, submission: newSubmission };
    });

    // 3. Fire the "fire-and-forget" trigger for the background worker
    triggerNextJob(job.id);

    // 4. Return an immediate, optimistic response to the frontend
    return NextResponse.json(
      { 
        displayId: submission.studentRegNo,
        status: "PENDING" 
      }, 
      { status: 201 }
    );

  } catch (error) {
    console.error("Submission failed:", error);
    return NextResponse.json({ error: "Failed to process submission." }, { status: 500 });
  }
}
