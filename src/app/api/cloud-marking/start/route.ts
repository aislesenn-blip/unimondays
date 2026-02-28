import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, cloudLink, totalMarks, markingScheme, questionPaperUrl, strictness, calibration } = body;

    if (!title || !cloudLink) {
        return NextResponse.json({ error: "Title and Cloud Link are required" }, { status: 400 });
    }

    // DIRECTIVE 2: FOLDER LINK REJECTION & UX
    if (cloudLink.includes('drive.google.com') && cloudLink.includes('/folders/')) {
        return NextResponse.json({ error: "Google Drive Folders are not supported via URL. Please provide a direct link to a single merged PDF, or download the folder and upload the files directly." }, { status: 400 });
    }

    // 1. Create Bulk Session
    const bulkSession = await prisma.bulkSession.create({
      data: {
        title,
        cloudLink,
        lecturerId: user.id,
        status: "PENDING",
        totalMarks: totalMarks || 100,
        markingScheme: markingScheme || "",
        questionPaperUrl: questionPaperUrl || null,
        calibration: JSON.stringify(calibration || {}),
      }
    });

    // 2. Create Job to process the link
    await prisma.job.create({
        data: {
            type: "CLOUD_MARKING",
            payload: JSON.stringify({ bulkSessionId: bulkSession.id, lecturerId: user.id }),
            status: "PENDING"
        }
    });

    // 3. Trigger Queue (Assuming we use the same queue endpoint)
    // In a real serverless env, we might hit the queue endpoint, but here we just create the job
    // and let the worker pick it up or trigger it explicitly if needed.
    // For now, let's assume the queue worker is polling or triggered via cron/webhook.
    // But to be responsive, we can fire-and-forget the process endpoint.
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/queue/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CLOUD_MARKING' }) // Signal to process
    }).catch(e => console.error("Failed to trigger queue", e));

    return NextResponse.json(bulkSession);

  } catch (error: any) {
    console.error("Cloud Marking Start Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
