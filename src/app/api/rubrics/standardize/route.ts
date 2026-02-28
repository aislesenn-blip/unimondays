import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { standardizeRubric } from "@/lib/ai/rubric-standardizer";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== "LECTURER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Missing or invalid text parameter" }, { status: 400 });
        }

        const standardizedRubric = await standardizeRubric(text);

        return NextResponse.json(standardizedRubric);

    } catch (error: any) {
        console.error("Standardize API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to standardize rubric" }, { status: 500 });
    }
}
