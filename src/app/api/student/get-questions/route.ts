import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { workSessionId } = await req.json();

        // Tunavuta mtihani kutoka DB
        const session = await prisma.workSession.findUnique({
            where: { id: workSessionId },
            select: { rubric: true } // Tunachukua rubric
        });

        if (!session) {
            return NextResponse.json({ error: "Mtihani haujapatikana" }, { status: 404 });
        }

        // Tunasoma data kwa usalama
        const rawRubric = session.rubric || "[]";
        const parsedRubric = typeof rawRubric === 'string' ? JSON.parse(rawRubric) : rawRubric;

        // ULINZI: Tunachukua IDs tu (mfano: ["1a", "1b"]). Hatutumi majibu kwa mwanafunzi!
        const questionIds = parsedRubric.map((item: any) => item.qId || item.questionId);

        return NextResponse.json({ questionIds });

    } catch (error: any) {
        console.error("Error fetching questions:", error.message);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
