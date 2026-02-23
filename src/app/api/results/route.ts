import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        score: true,
        quiz: true,
      },
      orderBy: { submittedAt: 'desc' }
    });

    return NextResponse.json(submissions);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
