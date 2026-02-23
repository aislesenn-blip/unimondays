import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DeepSeekService } from "@/lib/ai/deepseek";

const prisma = new PrismaClient();
const deepseek = new DeepSeekService();

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    // Fetch Context (Recent scores/submissions)
    const scores = await prisma.score.findMany({
      take: 10,
      include: {
          submission: {
              include: { quiz: true }
          }
      },
      orderBy: { id: 'desc' }
    });

    const contextData = JSON.stringify(scores.map(s => ({
        student: s.submission.studentRegNo,
        quiz: s.submission.quiz.title,
        marks: s.totalMarks,
        remarks: s.remarks
    })));

    const response = await deepseek.chatWithContext(contextData, query);

    return NextResponse.json({ response });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
