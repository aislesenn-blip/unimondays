
// src/app/api/bulk/start/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { enqueueJob } from "@/lib/queue";
import { JobType } from "@prisma/client";

/**
 * API Endpoint to initiate a bulk grading session.
 * Triggered by the lecturer's "Start Grading" button.
 * Performs critical pre-flight checks before enqueueing the master job.
 */
export async function POST(request: Request) {
  const { bulkSessionId } = await request.json();

  if (!bulkSessionId) {
    return NextResponse.json({ error: "Missing bulkSessionId" }, { status: 400 });
  }

  try {
    const bulkSession = await prisma.bulkSession.findUnique({
      where: { id: bulkSessionId },
    });

    if (!bulkSession) {
      return NextResponse.json({ error: "BulkSession not found" }, { status: 404 });
    }

    // --- CRITICAL VALIDATION ---
    // 1. Ensure a rubric/marking scheme exists before starting.
    if (!bulkSession.markingScheme) {
      await prisma.bulkSession.update({
        where: { id: bulkSessionId },
        data: { status: "FAILED", errorMessage: "Cannot start grading: Marking scheme is missing." },
      });
      return NextResponse.json({ error: "Cannot start grading: Marking scheme is missing." }, { status: 400 });
    }

    // 2. Ensure the session is in a valid state to start.
    if (bulkSession.status !== "PENDING") {
        return NextResponse.json({ error: `Cannot start session. It is already in status: ${bulkSession.status}`}, { status: 409 });
    }

    // --- JOB CREATION ---
    const job = await prisma.job.create({
      data: {
        type: JobType.PROCESS_BULK_SESSION,
        payload: JSON.stringify({ bulkSessionId }),
        status: "PENDING",
      },
    });

    await enqueueJob(job.id);

    await prisma.bulkSession.update({
      where: { id: bulkSessionId },
      data: { status: "QUEUED" }, // Update status to show it's in the queue
    });

    return NextResponse.json({ success: true, jobId: job.id, message: "Bulk session has been enqueued." });

  } catch (error: any) {
    console.error(`[API_BULK_START] Failed to start bulk session ${bulkSessionId}:`, error);
    // Best effort to mark the session as failed if an unexpected error occurs
    await prisma.bulkSession.update({
        where: { id: bulkSessionId },
        data: { status: "FAILED", errorMessage: "An unexpected error occurred during initiation." },
    }).catch(console.error);
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
