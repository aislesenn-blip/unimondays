import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id } = await params;
    const body = await req.json();
    const { registrationNumber } = body;

    // Strict Input Validation
    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return NextResponse.json({ error: "Registration Number is strictly required." }, { status: 400 });
    }

    const cleanRegNo = registrationNumber.trim().toUpperCase();

    // The session_id can act as the direct UUID of the WorkSession,
    // or the friendly 6-char workCode. We securely check both.
    const workSession = await prisma.workSession.findFirst({
        where: {
            OR: [
                { id: session_id },
                { workCode: session_id }
            ]
        }
    });

    if (!workSession) {
        return NextResponse.json({ error: "Academic session not found." }, { status: 404 });
    }

    // MANDATE: Security & Zero Leaking.
    // Query exclusively for the single submission matching the exact Reg No in this exact session.
    // Explicitly reject any `null` studentRegNo searches to prevent data dumps.
    const submission = await prisma.submission.findFirst({
        where: {
            workSessionId: workSession.id,
            studentRegNo: {
                equals: cleanRegNo,
                mode: 'insensitive' // Accommodate lowercase entries from students
            },
            // Ensure the script is actually ready for viewing
            status: { in: ['GRADED', 'FLAGGED'] }
        },
        include: {
            score: true
        }
    });

    if (!submission) {
        return NextResponse.json({
            error: "No graded script found for this Registration Number in the specified session."
        }, { status: 404 });
    }

    // MANDATE: Do NOT leak the entire class list or internal database relations.
    // Construct a strictly sanitized payload for public viewing.
    const safePayload = {
        id: submission.id, // Required for the Claiming API later
        status: submission.status,
        filePath: submission.filePath, // Proxied later for secure download
        workSessionTitle: workSession.title,
        totalMarks: submission.score?.totalMarks || 0,
        maxMarks: workSession.totalMarks || 100,
        // Safely parse the AI feedback breakdown
        breakdown: submission.score?.breakdown ? JSON.parse(submission.score.breakdown) : [],
        isClaimed: !!submission.userId // Boolean flag indicating if an account already owns this
    };

    return NextResponse.json(safePayload, { status: 200 });

  } catch (error: any) {
    console.error("[RESULTS_VERIFY_API] Error processing verification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
