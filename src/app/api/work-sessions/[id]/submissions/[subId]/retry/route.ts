import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const { id, subId } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id: subId, workSessionId: id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // UPDATE STATE FOR UI
    await prisma.submission.update({
      where: { id: subId },
      data: { status: "PENDING", feedback: null },
    });

    // INJECT TO QUEUE
    await prisma.job.create({
      data: {
        type: "AI_GRADE_SUBMISSION",
        payload: JSON.stringify({ submissionId: subId }),
        status: "PENDING",
        retryCount: 0,
      },
    });

    // START QUEUE NON-BLOCKING (IMPORTANT)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/queue/process`, {
        method: 'POST',
    }).catch(e => console.error("Failed to ping queue via fetch:", e));

    return NextResponse.json({ success: true, message: "Added to queue." });
  } catch (error: any) {
    console.error("[RETRY API ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}