import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    // 1. Enforce Authentication Context
    const user = await validateRequest(req);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please log in or create an account first." }, { status: 401 });
    }

    const { session_id } = await params;
    const body = await req.json();
    const { submissionId } = body;

    // Strict Input Validation
    if (!submissionId || typeof submissionId !== 'string') {
        return NextResponse.json({ error: "Submission ID is strictly required." }, { status: 400 });
    }

    // 2. Locate the specific submission
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId }
    });

    if (!submission) {
        return NextResponse.json({ error: "Academic result not found." }, { status: 404 });
    }

    // 3. Security Check: Prevent Overwriting Existing Accounts
    // Once a result is claimed by a User ID, it cannot be claimed by a different User ID.
    if (submission.userId && submission.userId !== user.id) {
        return NextResponse.json({ error: "This result has already been securely linked to another account." }, { status: 403 });
    }

    // 4. Update the Submission and link the User ID permanently
    await prisma.submission.update({
        where: { id: submissionId },
        data: {
            userId: user.id
        }
    });

    return NextResponse.json({
        success: true,
        message: "Result successfully linked and saved to your academic profile."
    }, { status: 200 });

  } catch (error: any) {
    console.error("[RESULTS_CLAIM_API] Error processing account link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
