import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { waitUntil } from "@vercel/functions";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, cloudLink, totalMarks, markingScheme, strictness, calibration } = body;

    if (!title || !cloudLink) {
        return NextResponse.json({ error: "Title and Cloud Link are required" }, { status: 400 });
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

    // 3. Trigger Serverless Process via waitUntil
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Cloud Marking worker logic has been simplified into synchronous conversions / direct Vercel streams.
    // Instead of doing PDF splitting in a background worker, for text-based system we just trigger the conversion.
    // For Vercel, we can await it if it's fast, or use waitUntil.
    // For now we just convert it to a standard session so users can submit via direct links.
    waitUntil(
        fetch(`${baseUrl}/api/cloud-marking/${bulkSession.id}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(e => console.error("Failed to trigger cloud conversion", e))
    );

    return NextResponse.json(bulkSession);

  } catch (error: any) {
    console.error("Cloud Marking Start Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
