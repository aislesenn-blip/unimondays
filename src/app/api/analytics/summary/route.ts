import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DeepSeekService } from "@/lib/ai/deepseek";

const prisma = new PrismaClient();
const deepseek = new DeepSeekService();

export async function GET(req: NextRequest) {
  try {
    // Fetch recent graded submissions (limit 20 to manage token context)
    const submissions = await prisma.submission.findMany({
      where: { status: "graded" },
      take: 20,
      orderBy: { submittedAt: "desc" },
      include: { score: true, quiz: true }
    });

    if (submissions.length === 0) {
      return NextResponse.json({ summary: "No graded submissions available for HOD analysis." });
    }

    // Calculate basic stats
    const total = submissions.length;
    const failed = submissions.filter(s => (s.score?.totalMarks || 0) < 40).length;
    const avg = submissions.reduce((acc, s) => acc + (s.score?.totalMarks || 0), 0) / total;

    // Prepare context for AI
    const statsContext = `
      Total Scripts Analyzed: ${total}
      Average Score: ${avg.toFixed(1)}
      Failure Rate (<40%): ${((failed / total) * 100).toFixed(1)}%

      Detailed Performance Samples:
      ${submissions.map(s =>
        `- Student ${s.studentRegNo} (Quiz: ${s.quiz.title}): Scored ${s.score?.totalMarks}. Remarks: ${s.score?.remarks?.slice(0, 100)}...`
      ).join("\n")}
    `;

    const summary = await deepseek.generateHODSummary(statsContext);

    return NextResponse.json({ summary });
  } catch (e: any) {
    console.error("HOD Summary Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
