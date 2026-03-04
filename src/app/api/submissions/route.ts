import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { inngest } from "@/inngest/client";

// Keep global for edge
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { studentId, workSessionId, fileUrl } = await req.json();

    if (!studentId || !workSessionId || !fileUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create or Update DB to PROCESSING state
    const submission = await prisma.submission.upsert({
      where: {
        studentId_workSessionId: {
          studentId,
          workSessionId,
        },
      },
      update: {
        fileUrl,
        status: "PROCESSING",
      },
      create: {
        studentId,
        workSessionId,
        fileUrl,
        status: "PROCESSING",
      },
      include: {
        workSession: {
          include: {
            rubric: true
          }
        }
      }
    });

    if (!submission.workSession.rubric) {
      return NextResponse.json(
        { error: "No rubric attached to this work session" },
        { status: 400 }
      );
    }

    // 2. Dispatch the background job to Inngest
    // Return success message instantly to frontend
    await inngest.send({
      name: "api/submission.uploaded",
      data: {
        submissionId: submission.id,
        fileUrl: fileUrl,
        rubricId: submission.workSession.rubricId,
        rubricData: submission.workSession.rubric.standardizedJson,
      },
    });

    return NextResponse.json(
      { success: true, message: "Submission queued for processing", submissionId: submission.id },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
