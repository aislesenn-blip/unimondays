import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";

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

    // Trigger background stream invisible to user using waitUntil
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    waitUntil(
        (async () => {
            try {
                // Await .text() so the fetch promise waits for the entire stream to finish
                const res = await fetch(`${baseUrl}/api/grade/stream`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || ''}`
                    },
                    body: JSON.stringify({ submissionId: subId }),
                });
                await res.text();
            } catch (e) {
                console.error("Retry stream failed to finish:", e);
            }
        })()
    );

    return NextResponse.json({ success: true, message: "Retrying grading..." });
  } catch (error: any) {
    console.error("[RETRY API ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}