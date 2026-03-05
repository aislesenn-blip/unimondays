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

    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return NextResponse.json({ error: "Registration Number is required" }, { status: 400 });
    }

    const cleanRegNo = registrationNumber.trim().toUpperCase();

    // The session_id could be the internal WorkSession ID or the friendly workCode.
    // We'll check both for maximum flexibility (Playbook WorkSession `id` or `workCode`)
    const workSession = await prisma.workSession.findFirst({
        where: {
            OR: [
                { id: session_id },
                { workCode: session_id }
            ]
        }
    });

    if (!workSession) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // STRICT ISOLATION & LEAK PREVENTION:
    // We only fetch the specific submission matching the EXACT cleanRegNo within this specific session.
    // We intentionally ignore any submission where studentRegNo is null to prevent massive dumps.
    const submission = await prisma.submission.findFirst({
        where: {
            workSessionId: workSession.id,
            studentRegNo: {
                equals: cleanRegNo,
                mode: 'insensitive' // Postgres case-insensitive match
            },
            // Ensure we don't return anything that hasn't finished processing or failed
            status: { in: ['GRADED', 'FLAGGED'] }
        },
        include: {
            score: true // Include the score breakdown
        }
    });

    if (!submission) {
        return NextResponse.json({
            error: "No graded script found for this Registration Number in this session."
        }, { status: 404 });
    }

    // Data Sanitization: Only return exactly what the student needs to see.
    // Do NOT return internal IDs or other students' data.
    const safePayload = {
        id: submission.id, // Needed for claiming later
        status: submission.status,
        filePath: submission.filePath, // To fetch the PDF via our secure download proxy
        workSessionTitle: workSession.title,
        totalMarks: submission.score?.totalMarks || 0,
        maxMarks: workSession.totalMarks || 100,
        // The breakdown contains the AI evaluation
        breakdown: submission.score?.breakdown ? JSON.parse(submission.score.breakdown) : [],
        isClaimed: !!submission.userId // If it's already linked to a user account
    };

    return NextResponse.json(safePayload, { status: 200 });

  } catch (error: any) {
    console.error("[RESULTS_VERIFY_API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
