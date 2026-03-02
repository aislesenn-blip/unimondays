
// src/app/api/queue/process/route.ts
import { NextResponse } from "next/server";
import { qstash } from "@/lib/queue";
import { gradingWorker } from "@/lib/workers/grading-worker";

interface QStashRequestBody {
  jobId: string;
}

async function handler(request: Request) {
  const body: QStashRequestBody = await request.json();
  const { jobId } = body;

  const retries = parseInt(request.headers.get("Upstash-Retried") || "0", 10);
  const maxRetries = 5;

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    await gradingWorker(jobId, { isLastAttempt: retries >= maxRetries });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[QSTASH_HANDLER_ERROR] Job ${jobId} (Attempt ${retries + 1}/${maxRetries + 1}) failed:`, error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const POST = async (req: Request) => {
  return await qstash.verifySignature(req, {
    handler: handler,
  });
};
