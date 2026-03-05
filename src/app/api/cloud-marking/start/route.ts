import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { after } from "next/server"; // Next.js 15+ background execution

export const maxDuration = 300; // 5 minutes max for Vercel

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Replaced cloudLink with bulkFilePath per the new frontend Phase 1 integration
    const { title, bulkFilePath, totalMarks, markingScheme, strictness, calibration } = body;

    if (!title || !bulkFilePath) {
        return NextResponse.json({ error: "Title and massive PDF bulk file path are required." }, { status: 400 });
    }

    // 1. Create Bulk Session (This acts as our Session container)
    // We repurpose the `cloudLink` column to store our internal `bulkFilePath`
    const bulkSession = await prisma.bulkSession.create({
      data: {
        title,
        cloudLink: bulkFilePath,
        lecturerId: user.id,
        status: "PENDING", // Initiating the Slicing/Extraction phase
        totalMarks: totalMarks || 100,
        markingScheme: markingScheme || "",
        calibration: JSON.stringify(calibration || {}),
      }
    });

    // 2. We use Next.js `after()` to process the heavy PDF slicing in the background
    // This allows us to instantly return a 200 OK to the frontend, fulfilling the "Fire and Forget" promise.
    after(async () => {
        try {
            console.log(`[CLOUD_MARKING_INIT] Starting background worker for BulkSession: ${bulkSession.id}`);

            // Lazy load the heavy worker module only when executed
            // This prevents Vercel serverless function size bloat on the main route
            const { handleCloudMarking } = await import('@/workers/cloud-worker');

            await handleCloudMarking({
                bulkSessionId: bulkSession.id,
                bulkFilePath: bulkFilePath,
                lecturerId: user.id
            });

        } catch (backgroundError) {
            console.error(`[CLOUD_MARKING_FATAL] Background worker crashed for ${bulkSession.id}:`, backgroundError);

            // Update session status to FAILED so the UI can reflect the crash
            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: {
                    status: 'FAILED',
                    errorMessage: backgroundError instanceof Error ? backgroundError.message : 'Unknown Slicing Error'
                }
            });
        }
    });

    // 3. Immediately return the session ID to redirect the frontend to the progress dashboard
    return NextResponse.json({ id: bulkSession.id, message: "Ingestion pipeline initialized." }, { status: 200 });

  } catch (error: any) {
    console.error("[CLOUD_MARKING_START] Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
