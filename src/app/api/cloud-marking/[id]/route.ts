import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Use workSessions relation to get submissions
    const bulkSession = await prisma.bulkSession.findUnique({
      where: { id },
      include: {
        workSessions: {
          include: {
            submissions: {
              select: {
                 id: true,
                 studentRegNo: true,
                 studentName: true,
                 status: true,
                 score: { select: { totalMarks: true, detectedIdentity: true } },
                 userId: true,
                 confidenceScore: true
              }
            }
          }
        }
      }
    });

    if (!bulkSession) {
      return NextResponse.json({ error: "Bulk Session not found" }, { status: 404 });
    }

    if (bulkSession.lecturerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Flatten submissions from all related work sessions
    const submissions = bulkSession.workSessions.flatMap(ws => ws.submissions);

    // Calculate if grading is fully complete across all work sessions and update status if needed
    let finalStatus = bulkSession.status;
    if (finalStatus === 'READY' || finalStatus === 'PROCESSING') {
        // A READY session with 0 submissions means no valid scripts were found to grade. It should complete.
        const isGradingComplete = submissions.length === 0 && finalStatus === 'READY'
            ? true
            : (submissions.length > 0 && submissions.every(s => ['GRADED', 'FLAGGED', 'FAILED'].includes(s.status)));

        if (isGradingComplete) {
            finalStatus = 'COMPLETED';
            // Optionally persist this terminal state update to the database to prevent infinite status checks on refresh
            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: { status: 'COMPLETED' }
            }).catch(e => console.error("Failed to update bulk session terminal status:", e));
        }
    }

    // Return the bulk session data with flattened submissions to match UI expectations
    const responseData = {
        ...bulkSession,
        status: finalStatus,
        submissions,
        workSessions: undefined // Optionally remove the nested structure if not needed by UI
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Cloud Marking Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
