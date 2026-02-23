import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { TierManager } from "@/lib/utils/tier-manager";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Enforce Quota (Mock User ID 1 for now)
    const canUpload = await TierManager.checkQuota(1, 1);
    if (!canUpload) {
        return NextResponse.json({ error: "Quota Exceeded. Please upgrade tier." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const quizCode = formData.get("quizCode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Use /tmp for serverless compatibility
    const uploadDir = os.tmpdir();

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    // Create or find Quiz
    let quizId = 1;
    let quiz = await prisma.quiz.findFirst();

    if (!quiz) {
      // Create Dummy Lecturer & Quiz if none
      const lecturer = await prisma.user.upsert({
        where: { email: "hod@osprey.com" },
        update: {},
        create: {
            email: "hod@osprey.com",
            role: "lecturer",
            tier: "X",
            quota: 1000,
        },
      });

      quiz = await prisma.quiz.create({
        data: {
          title: "Default Assessment",
          code: "DEFAULT-101",
          lecturerId: lecturer.id,
          isUpload: true,
          rubric: "Standard Academic Rubric: Clarity (5 marks), Accuracy (5 marks)."
        },
      });
    }
    quizId = quiz.id;

    const submission = await prisma.submission.create({
      data: {
        quizId: quizId,
        studentRegNo: "PENDING_COLLATION",
        studentName: "Unknown",
        filePath: filePath,
        status: "pending",
      },
    });

    // Increment Usage
    await TierManager.incrementUsage(1, 1);

    return NextResponse.json({
        message: "Upload successful",
        submissionId: submission.id,
        status: "pending"
    });

  } catch (e: any) {
    console.error("Upload Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
