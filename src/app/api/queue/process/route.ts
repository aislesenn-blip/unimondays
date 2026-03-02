
// src/app/api/queue/process/route.ts
import { NextResponse } from "next/server";
import { verifySignature } from "@upstash/qstash/next";
import { gradingWorker } from "@/lib/workers/grading-worker";

interface QStashRequestBody {
  jobId: string;
}

async function handler(request: Request) {
  const body: QStashRequestBody = await request.json();
  const { jobId } = body;

  // Extract QStash-specific headers for retry context
  const retries = parseInt(request.headers.get("Upstash-Retried") || "0", 10);
  const maxRetries = 5; // Should match the `retries` value in enqueueJob

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    await gradingWorker(jobId, { isLastAttempt: retries >= maxRetries });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[QSTASH_HANDLER_ERROR] Job ${jobId} (Attempt ${retries + 1}/${maxRetries + 1}) failed:`, error);
    // The worker now handles the DB status update. We just need to return an error
    // to signal QStash to either retry or give up.
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// We wrap the handler with verifySignature to ensure the request is from QStash
export const POST = verifySignature(handler);
