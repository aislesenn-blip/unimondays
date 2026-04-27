import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { pdf } from 'pdf-to-img';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

export const maxDuration = 300;

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

        let promptContent: any[] = [];

        if (isRubric) {
            promptContent.push({
                type: "text",
                text: `You are an elite educational engineer. Rewrite this raw marking scheme into the strict "Playbook Standard Format" represented as a JSON array.

CRITICAL MANDATES:
NO DATA LOSS: Preserve every alternative answer and exact mark allocation.
STRICT HIERARCHY & SECTIONS: Every single question/sub-question MUST have its own object block. Do not merge sub-questions.
ATOMIC CRITERIA: Break down paragraph answers into explicit, atomic, true/false grading criteria. Each criterion must represent exactly one independently gradable concept.
Output ONLY the structured text. No markdown block wrapping (\`\`\`json).

The JSON MUST exactly match this format:
[
  {
    "qId": "string", // Example: "1a", "2_b"
    "maxScore": number, // Example: 3
    "criteria": [
      {
         "id": "string", // Example: "c1", "c2"
         "text": "string", // Example: "States 'conversion of light energy to chemical energy'"
         "marks": number // Example: 1
      }
    ]
  }
]
`
            });
        } else {
            promptContent.push({
                type: "text",
                text: `You are an elite Academic Transcriber. Your task is to read the provided student exam document pages and output a highly accurate, verbatim, raw text transcription.

CRITICAL INSTRUCTIONS:
1. Extract ALL handwritten and printed text precisely exactly as it appears.
2. DO NOT ATTEMPT TO MAP OR ORGANIZE BY QUESTION ID. Just output the raw text in the order it appears on the page.
3. DO NOT output JSON. Output clean, raw text using clear markdown headers if a new question number is explicitly written (e.g. \`\n\n=== QUESTION 1 ===\n\n\`).
4. REGISTRATION NUMBER: Ensure the Registration Number is captured clearly at the top if present.
5. Your ONLY goal is 100% accurate, verbatim transcription of the content so that a downstream AI engine can analyze it.`
            });
        }

        let pageImages: string[] = [];

        if (mime === 'application/pdf') {
            console.log("[OCR] Converting PDF to images...");
            const document = await pdf(buffer, { scale: 1.0 });
            for await (const imageBuffer of document) {
                pageImages.push(`data:image/jpeg;base64,${imageBuffer.toString('base64')}`);
            }
            console.log(`[OCR] PDF converted to ${pageImages.length} images.`);
        } else if (mime.startsWith('image/')) {
            pageImages.push(`data:${mime};base64,${buffer.toString('base64')}`);
        } else {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and images are supported.' }, { status: 400 });
        }

        console.log("[OCR] Sending to Gemini...");

        // Batch processing logic (5 pages per batch) to prevent Vercel/Gemini timeouts for large exams
        let textOutputs: string[] = [];
        const BATCH_SIZE = 5;

        for (let i = 0; i < pageImages.length; i += BATCH_SIZE) {
            const batchImages = pageImages.slice(i, i + BATCH_SIZE);
            console.log(`[OCR] Processing batch ${i / BATCH_SIZE + 1} (${batchImages.length} images)...`);

            const batchPromptContent = [...promptContent]; // Clone the base text prompt
            for (const img of batchImages) {
                batchPromptContent.push({ type: "image", image: img });
            }

            const { text } = await generateText({
                model: google('gemini-2.5-pro'), // Use PRO model for deep logic & large context
                messages: [{ role: "user", content: batchPromptContent as any }],
                temperature: 0.0,
            });
            textOutputs.push(text);
        }

        console.log("[OCR] Extraction complete.");

        let finalText = "";

        if (isRubric) {
            // Rubrics expect an Array. Stitch multiple arrays together.
            try {
                let mergedRubric: any[] = [];
                for (const text of textOutputs) {
                    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);
                    if (Array.isArray(parsed)) mergedRubric.push(...parsed);
                }
                if (mergedRubric.length === 0) throw new Error("No array found");
                finalText = JSON.stringify(mergedRubric);
            } catch (e) {
                console.warn("[OCR] Rubric array stitching failed. Falling back to plain text.");
                finalText = textOutputs.join('\n\n').replace(/```json/gi, '').replace(/```/g, '').trim();
            }
        } else {
            // Student exams just output raw text now to prepare for PASS 1 and PASS 1B
            finalText = textOutputs.join('\n\n\n=== NEXT BATCH ===\n\n\n');
        }

        return NextResponse.json({ success: true, text: finalText });

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}