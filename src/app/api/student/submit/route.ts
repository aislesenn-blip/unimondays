
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { JobType, GradingStatus } from "@prisma/client";
import { enqueueJob } from "@/lib/queue";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { filePath, workSessionId, filename } = await request.json();

    if (!filePath || !workSessionId) {
      return NextResponse.json(
        { error: "Missing filePath or workSessionId" },
        { status: 400 }
      );
    }

    const workSession = await prisma.workSession.findUnique({
      where: { id: workSessionId }
    });

    if (!workSession) {
        return NextResponse.json({ error: "Work session not found" }, { status: 404 });
    }

    // 1. Create the Submission record
    const submission = await prisma.submission.create({
      data: {
        workSessionId,
        userId: user.id, // Use authenticated user ID
        studentRegNo: user.studentId || '', // Use studentId from user model
        studentName: user.name || '', // Use name from user model
        filePath,
        fileName: filename || file.name,
        status: "PENDING",
        gradingStatus: GradingStatus.PENDING,
      },
    });

    // 2. Create the Parent Job (MAP_SUBMISSION)
    const parentJob = await prisma.job.create({
      data: {
        type: JobType.MAP_SUBMISSION,
        status: "PENDING",
        submissionId: submission.id,
        payload: JSON.stringify({
          submissionId: submission.id,
          filePath,
          workSessionId: workSession.id,
          standardizedRubricId: workSession.standardizedRubricId, // Pass rubric for grading
        }),
      },
    });

    // 3. Enqueue the Parent Job for immediate processing
    await enqueueJob(parentJob.id);

    // 4. Update submission status to reflect enqueuing
    await prisma.submission.update({
      where: { id: submission.id },
      data: { gradingStatus: GradingStatus.MAPPING },
    });

    return NextResponse.json({
      message: "Submission received and is being processed.",
      submissionId: submission.id,
      jobId: parentJob.id,
    });
  } catch (error) {
    console.error("Error creating submission and job:", error);
    return NextResponse.json(
      { error: "Failed to process submission." },
      { status: 500 }
    );
  }
}
