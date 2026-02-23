import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DeepSeekService } from "@/lib/ai/deepseek";

const prisma = new PrismaClient();
const deepseek = new DeepSeekService();

export async function POST(req: NextRequest) {
  try {
    const { quizId } = await req.json();

    if (!quizId) {
        return NextResponse.json({ error: "Missing quizId" }, { status: 400 });
    }

    // Fetch all graded submissions for this quiz
    const submissions = await prisma.submission.findMany({
      where: {
        quizId: parseInt(quizId),
        status: "graded",
      },
      include: {
        score: true,
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ summary: "No graded submissions available for analysis." });
    }

    // Filter low performing students (< 40%)
    const failures = submissions.filter(s => (s.score?.totalMarks || 0) < 40);
    const failureRate = (failures.length / submissions.length) * 100;

    // Prepare data for DeepSeek
    const failureContext = failures.map(s => ({
        student: s.studentRegNo,
        score: s.score?.totalMarks,
        remarks: s.score?.remarks,
        breakdown: s.score?.breakdown
    }));

    const prompt = `
      Analyze the following student failure data for Quiz ID ${quizId}.
      Failure Rate: ${failureRate.toFixed(2)}%

      Failed Student Data:
      ${JSON.stringify(failureContext).slice(0, 5000)} // Truncate if too long

      TASK:
      Generate a 3-sentence executive summary for the Head of Department (HOD).
      Focus on WHY students are failing (e.g., specific concepts, question types).
      Be professional, concise, and actionable.

      Output strictly the 3 sentences.
    `;

    // Use DeepSeek for reasoning
    // We can use the chat completion API
    const response = await deepseek.chatWithContext("", prompt); // Empty context, just prompt

    return NextResponse.json({ summary: response });

  } catch (e: any) {
    console.error("Summary Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
