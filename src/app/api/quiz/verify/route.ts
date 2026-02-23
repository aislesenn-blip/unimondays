import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    const quiz = await prisma.quiz.findUnique({
      where: { code: code },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Invalid Code" }, { status: 404 });
    }

    return NextResponse.json({
        valid: true,
        quizId: quiz.id,
        quizTitle: quiz.title,
        code: quiz.code
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
