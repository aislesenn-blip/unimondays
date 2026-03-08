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

    // SERVERLESS MAP-REDUCE PATTERN
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const triggerUrl = `${baseUrl}/api/grade/trigger`;

    fetch(triggerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: subId })
    }).catch(e => console.error("Failed to ping trigger via fetch:", e));

    return NextResponse.json({ success: true, message: "Triggered Map-Reduce." });
  } catch (error: any) {
    console.error("[RETRY API ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}