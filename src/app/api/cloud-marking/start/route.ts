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

    // 3. Trigger Serverless Process
    // Cloud Marking uses a different worker logic than grade trigger usually, but if it translates to grade trigger:
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cloud-marking/${bulkSession.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(e => console.error("Failed to trigger cloud conversion", e));

    return NextResponse.json(bulkSession);

  } catch (error: any) {
    console.error("Cloud Marking Start Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
