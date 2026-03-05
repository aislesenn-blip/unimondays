import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const user = await validateRequest(req);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please log in or sign up first." }, { status: 401 });
    }

    const { session_id } = await params;
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId || typeof submissionId !== 'string') {
        return NextResponse.json({ error: "Submission ID is required." }, { status: 400 });
    }

    // 1. Verify the Submission Exists
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId }
    });

    if (!submission) {
        return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // 2. Prevent Overwriting Existing Claims
    // If the submission already belongs to another user, do not let this user claim it.
    if (submission.userId && submission.userId !== user.id) {
        return NextResponse.json({ error: "This result has already been claimed by another account." }, { status: 403 });
    }

    // 3. Link the Submission to the Authenticated User
    await prisma.submission.update({
        where: { id: submissionId },
        data: {
            userId: user.id
        }
    });

    return NextResponse.json({ success: true, message: "Result successfully claimed and saved to your account." }, { status: 200 });

  } catch (error: any) {
    console.error("[RESULTS_CLAIM_API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
