
// src/app/api/queue/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import { receiver } from "@/lib/queue";
import { gradingWorker } from "@/lib/workers/grading-worker";

async function handler(req: NextRequest) {
  const body = await req.json();
  const { jobId } = body;

  const retries = parseInt(req.headers.get("Upstash-Retried") || "0", 10);
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

export async function POST(req: NextRequest) {
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const isValid = await receiver.verify({ 
    signature, 
    body: await req.text()
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // We need to clone the request to read the body again in the handler
  return handler(req.clone());
}
