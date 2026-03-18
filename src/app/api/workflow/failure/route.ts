import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { prisma } from "@/lib/prisma";

export const POST = verifySignatureAppRouter(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const payloadString = body.body || "{}"; // QStash failure webhook payload
      const errorMsg = body.error || "Unknown workflow error";

      const payload = JSON.parse(payloadString);
      const submissionId = payload.submissionId;

      if (submissionId) {
          console.error(`[WORKFLOW-FAILURE] Terminal Failure for Submission ${submissionId}: ${errorMsg}`);
          await prisma.submission.update({
              where: { id: submissionId },
              data: { status: 'FAILED', feedback: `Grading pipeline failed permanently: ${errorMsg}` }
          });
      }

      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  },
  {
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || 'dummy',
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || 'dummy'
  }
);
