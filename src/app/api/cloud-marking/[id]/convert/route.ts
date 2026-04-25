import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const internalKey = process.env.INTERNAL_API_KEY;

    let user = null;

    // Check if internal background request
    if (internalKey && authHeader === `Bearer ${internalKey}`) {
        // Find the user from the bulk session directly if triggered internally
        const { id: tempId } = await params;
        const bulkData = await prisma.bulkSession.findUnique({ where: { id: tempId } });
        if (bulkData) {
            user = { id: bulkData.lecturerId };
        }
    } else {
        // Fallback to user session
        user = await getAuthenticatedUser();
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bulkSessionId } = await params;

    const bulkSession = await prisma.bulkSession.findUnique({
        where: { id: bulkSessionId },
        include: { lecturer: true }
    });

    if (!bulkSession) return NextResponse.json({ error: "Bulk Session not found" }, { status: 404 });
    if (bulkSession.lecturerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 1. Create a New Class for this Bulk Session
    // In V6 we might let them select a class, but for now we auto-create "Class from Bulk [Date]"
    const className = `Bulk Import ${new Date().toLocaleDateString()}`;
    const classCode = `BULK-${Math.floor(Math.random() * 10000)}`; // Simple unique code

    const newClass = await prisma.classes.create({
        data: {
            name: className,
            code: classCode,
            lecturerId: user.id,
            status: 'ACTIVE'
        }
    });

    // 2. Link or create a WorkSession to this Class
    // Previously a background worker did this, but now we create it synchronously
    // to allow students to submit immediately using the synchronous OCR -> Vercel streaming pipeline.
    let workSession = await prisma.workSession.findFirst({
        where: { bulkSessionId }
    });

    if (!workSession) {
        workSession = await prisma.workSession.create({
            data: {
                title: bulkSession.title,
                workCode: `BULK-${bulkSession.id.substring(0,6).toUpperCase()}`,
                lecturerId: bulkSession.lecturerId,
                classId: newClass.id,
                type: 'WORK_SESSION', // Standard session type
                status: 'PUBLISHED',
                bulkSessionId: bulkSession.id,
                totalMarks: bulkSession.totalMarks,
                markingScheme: bulkSession.markingScheme,
                goldStandardUrl: bulkSession.goldStandardUrl,
                calibration: bulkSession.calibration,
                releaseMode: "MANUAL"
            }
        });
    } else {
        await prisma.workSession.update({
            where: { id: workSession.id },
            data: {
                classId: newClass.id,
                type: 'WORK_SESSION',
                status: 'PUBLISHED'
            }
        });
    }

    // 3. Update Status
    await prisma.bulkSession.update({
        where: { id: bulkSessionId },
        data: { status: 'CONVERTED' }
    });

    return NextResponse.json({ success: true, classId: newClass.id, workSessionId: workSession.id });

  } catch (error: any) {
    console.error("Conversion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
