import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { standardizeRubric } from "@/lib/ai/rubric-standardizer";
import { readFile } from "@/lib/storage";

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

        let standardizedRubric;

        // Check if text is actually a Supabase storage path (e.g. bulk_uploads/schemes/... or ends with pdf/jpg/png)
        const isStoragePath = text.startsWith("bulk_uploads/") || text.startsWith("submissions/") || text.match(/\.(pdf|jpg|jpeg|png)$/i);

        if (isStoragePath) {
            console.log(`[STANDARDIZE] Detected file path. Fetching from storage: ${text}`);
            const buffer = await readFile(text, 'exam_pdfs');
            const mimeType = text.toLowerCase().endsWith('.png') ? 'image/png' :
                             text.toLowerCase().endsWith('.jpg') || text.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                             'application/pdf';

            standardizedRubric = await standardizeRubric(text, buffer, mimeType);
        } else {
            console.log(`[STANDARDIZE] Processing as raw text.`);
            standardizedRubric = await standardizeRubric(text);
        }

        return NextResponse.json(standardizedRubric);

    } catch (error: any) {
        console.error("Standardize API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to standardize rubric" }, { status: 500 });
    }
}
