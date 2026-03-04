import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { inngest } from "@/lib/inngest";

export async function POST(req: Request) {
  try {
    const { workCode, pdfUrl, studentId } = await req.json();

    if (!workCode || !pdfUrl) {
      return new NextResponse("Missing data", { status: 400 });
    }

    const session = await prisma.workSession.findUnique({
      where: { workCode },
    });

    if (!session) {
      return new NextResponse("Invalid work code", { status: 404 });
    }

    // Since we're doing a mock auth for students we'll use a dummy ID or the provided one
    const actualStudentId = studentId || `student-${Math.random().toString(36).substring(7)}`;

    // Ensure student exists (Mocking it here)
    await prisma.user.upsert({
      where: { id: actualStudentId },
      update: {},
      create: {
        id: actualStudentId,
        email: `${actualStudentId}@student.edu`,
        role: "STUDENT",
      }
    });

    const submission = await prisma.submission.create({
      data: {
        studentId: actualStudentId,
        workSessionId: session.id,
        pdfUrl,
        status: "PROCESSING",
      },
    });

    // Trigger Inngest queue background job
    await inngest.send({
      name: "app/submission.process",
      data: {
        submissionId: submission.id,
        pdfUrl: submission.pdfUrl,
        rubricId: session.rubricId,
      },
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error("[SUBMISSION_UPLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
