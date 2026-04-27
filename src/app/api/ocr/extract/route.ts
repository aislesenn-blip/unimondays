import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { pdf } from 'pdf-to-img';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { generateText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

export const maxDuration = 300;

// The strict Zod schema enforcing the Playbook Standard Format
const rubricSchema = z.object({
  sections: z.array(z.object({
    sectionName: z.string().describe("The name of the section, e.g., 'A', 'GENERAL', 'Section 1'"),
    questions: z.array(z.object({
      questionId: z.string().describe("The exact question identifier (e.g., '1a', 'Question 2'). MUST be normalized to a standard alphanumeric string where possible."),
      topic: z.string().describe("A very brief, 1-3 word topic of what the question is asking (e.g., 'Photosynthesis Definition', 'Area Calculation')."),
      maxScore: z.number().describe("The absolute total maximum marks possible for this specific question block."),
      criteria: z.array(z.object({
        id: z.string().describe("A unique ID for this criterion, e.g., 'c1', 'c2'."),
        text: z.string().describe("The exact, atomic, true/false requirement (e.g., 'States conversion of light to chemical energy', 'Mentions Water')."),
        marks: z.number().describe("The specific marks awarded if this single criterion is met.")
      })).describe("The atomic breakdown of the marking scheme for this question.")
    }))
  }))
});

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('auth-session');

        if (!sessionCookie) {
             return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });
        }

        const { filePath, isRubric } = await req.json();

        if (!filePath) {
            return NextResponse.json({ error: 'No file path provided.' }, { status: 400 });
        }

        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);

        if (downloadError || !fileData) {
             throw new Error(`Supabase Download Failed: ${downloadError?.message}`);
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const type = await fileTypeFromBuffer(buffer);
        const mime = type?.mime || 'application/pdf';

        if (isRubric) {
            console.log("[OCR] Extracting Rubric with L9 OPTIMIZE_PROMPT...");

            const optimizePrompt = `You are an elite educational engineer. Rewrite the provided raw marking scheme document into strict "Atomic Criteria".

CRITICAL MANDATES:
1. NO DATA LOSS: Preserve every alternative answer and exact mark allocation.
2. STRICT HIERARCHY & SECTIONS: Group questions by section. If none, use 'GENERAL'.
3. ATOMIC CRITERIA: Break down paragraph answers into explicit, atomic, true/false grading criteria. Each criterion must represent exactly one independently gradable concept.
4. NORMALIZATION: Normalize question IDs (e.g., '1. a)' -> '1a').
5. PRECISION: Ensure the sum of marks for the criteria exactly matches the question's maxScore unless alternatives (OR conditions) are present.
`;

            let allImages: any[] = [];
            if (mime === 'application/pdf') {
                const document = await pdf(buffer, { scale: 1.0 });
                for await (const imageBuffer of document) {
                    allImages.push({ type: "image", image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` });
                }
            } else if (mime.startsWith('image/')) {
                allImages.push({ type: "image", image: `data:${mime};base64,${buffer.toString('base64')}` });
            } else {
                return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
            }

            try {
                const { object } = await generateObject({
                    model: google('gemini-2.5-pro'),
                    system: optimizePrompt,
                    messages: [{ role: "user", content: [{ type: "text", text: "Parse this marking scheme document:" }, ...allImages] as any }],
                    schema: rubricSchema,
                    temperature: 0.0,
                });

                console.log("[OCR] Rubric accurately parsed to Atomic JSON.");
                return NextResponse.json({ success: true, text: JSON.stringify(object.sections) });

            } catch (e) {
                console.error("[OCR] Failed to structure rubric into JSON:", e);
                return NextResponse.json({ error: 'Failed to extract strict atomic criteria from rubric.' }, { status: 500 });
            }

        } else {
            // L9 FIX: BATCH PROCESSING KWA MTIHANI WA MWANAFUNZI (ZERO TRUNCATION)
            const systemText = `You are a highly intelligent Exam Transcription Engine with advanced cognitive collation abilities. Your task is to extract handwritten and printed text from the provided student exam document and construct a perfectly organized, highly readable raw text transcription.

COGNITIVE COLLATION DIRECTIVES (USE YOUR INTELLIGENCE):
1. INTELLIGENT SEQUENCING: Students often answer questions chaotically. Use your advanced reasoning to identify question numbers. Normalize them (e.g., '1. a)' becomes '1a').
2. VISUAL DEMARCATION (CRITICAL): You MUST insert strong visual boundaries between questions to prevent bleeding. Use exact formatting like:
=== QUESTION 1a ===
[Text for Q1a]
=== QUESTION 1b ===
[Text for Q1b]
3. CONTEXTUAL DECIPHERING: Use contextual semantic reasoning to decipher sloppy words correctly without altering the student's intended scientific meaning.
4. VISUAL TRANSLATION: If the student drew a diagram, explicitly describe it in text (e.g., "[Student drew a diagram of a plant cell with labels X, Y, Z]").

STRICT BOUNDARIES:
1. ZERO HALLUCINATION: Extract only what the student wrote. Do not correct their factual scientific errors.
2. NO JSON: Output ONLY clean, structured raw text with markdown boundaries. No JSON output.
3. REGISTRATION NUMBER: Find the student's ID/Registration Number and place it prominently at the very top.`;

            let allImages: any[] = [];
            if (mime === 'application/pdf') {
                console.log("[OCR] Converting Student PDF to images...");
                const document = await pdf(buffer, { scale: 1.0 });
                for await (const imageBuffer of document) {
                    allImages.push({ type: "image", image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` });
                }
                console.log(`[OCR] PDF converted to ${allImages.length} images.`);
            } else if (mime.startsWith('image/')) {
                allImages.push({ type: "image", image: `data:${mime};base64,${buffer.toString('base64')}` });
            } else {
                 return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
            }

            // Tunakata picha 5 kwa 5 na tunatumia PRO tupu.
            let finalText = "";
            const BATCH_SIZE = 5;
            for (let i = 0; i < allImages.length; i += BATCH_SIZE) {
                const batchImages = allImages.slice(i, i + BATCH_SIZE);
                console.log(`[OCR] Extracting Student Exam Batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(allImages.length/BATCH_SIZE)} using PRO Model...`);

                const { text } = await generateText({
                    model: google('gemini-2.5-pro'),
                    messages: [{ role: "user", content: [{ type: "text", text: systemText }, ...batchImages] as any }],
                    temperature: 0.0,
                });
                finalText += text + "\n\n";
            }
            console.log("[OCR] Student Exam Extraction complete.");
            return NextResponse.json({ success: true, text: finalText });
        }

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}