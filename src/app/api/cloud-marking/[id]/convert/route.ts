import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
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

    // 2. Link the Existing WorkSession to this Class
    // The worker already created a WorkSession with type='BULK' and bulkSessionId
    const workSession = await prisma.workSession.findFirst({
        where: { bulkSessionId }
    });

    if (!workSession) {
        return NextResponse.json({ error: "Associated WorkSession not found. worker might have failed." }, { status: 500 });
    }

    await prisma.workSession.update({
        where: { id: workSession.id },
        data: {
            classId: newClass.id,
            type: 'WORK_SESSION', // Convert to standard session
            status: 'PUBLISHED'
        }
    });

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
