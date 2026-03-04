import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db/prisma";
import { openrouter } from "@/lib/ai/openrouter";
import { generateText, generateObject } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { classId, title, rubricUrl } = await req.json();

    if (!classId || !title || !rubricUrl) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Step 1: Standardize Rubric via AI
    const rawTextRes = await generateText({
      model: openrouter("google/gemini-2.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the exact marking scheme (rubric) text from this document.",
            },
            {
              type: "image",
              image: rubricUrl,
            },
          ],
        },
      ],
    });

    const standardizedRes = await generateObject({
      model: openrouter("deepseek/deepseek-chat"),
      schema: z.object({
        questions: z.array(
          z.object({
            question_number: z.string(),
            question_title: z.string(),
            max_marks: z.number(),
            marking_criteria: z.string(),
            example_answer: z.string().optional(),
          })
        ),
      }),
      prompt: `Standardize the following extracted text into a strict JSON Rubric schema.\n\nText:\n${rawTextRes.text}`,
    });

    // Step 2: Create Rubric
    const rubric = await prisma.rubric.create({
      data: {
        lecturerId: userId,
        name: `${title} Rubric`,
        originalPdfUrl: rubricUrl,
        standardizedJson: standardizedRes.object as any,
      },
    });

    // Step 3: Create WorkSession
    // Generate a secure 6 character alphanumeric workcode
    const workCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const workSession = await prisma.workSession.create({
      data: {
        classId,
        rubricId: rubric.id,
        title,
        workCode,
      },
    });

    return NextResponse.json(workSession);
  } catch (error) {
    console.error("[WORK_SESSIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
