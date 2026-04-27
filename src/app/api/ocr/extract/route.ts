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
                text: `You are an L9 Intelligent Exam Collator. Your task is to read the provided student exam document and output a highly structured, logical text transcription.

CRITICAL INSTRUCTIONS:
1. Extract ALL handwritten and printed text precisely.
2. INTELLIGENT SEMANTIC ROUTING (MANDATORY): Do NOT output page by page. Students answer questions out of order. You MUST collate, stitch, and group ALL parts of a single question's answer together under its Question ID.
3. REGISTRATION NUMBER: Extract the student's Registration Number/ID if present.
4. Output STRICTLY as a JSON object where keys are the Question IDs (normalized, e.g., "1a", "2b") and values are the full concatenated text of the student's answer for that Question ID.

Example Output format (Strictly JSON, no markdown):
{
  "REGISTRATION_NUMBER": "2018-04-12551",
  "1a": "Student's full answer for 1a...",
  "1b": "Student's full answer for 1b..."
}`
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

        // For rubrics or single-batch student exams, just use the first output.
        // For multi-batch student exams, we need to stitch the JSON back together if it was split.
        // For simplicity right now, we will assume Gemini PRO handles 5-page chunks well and
        // we can attempt to merge the JSON outputs if needed, or simply let the frontend handle the combined string.
        let finalText = textOutputs.join('\n\n');

        try {
            // Ensure it's clean JSON by stripping markdown if Gemini disobeys
            const cleanJson = finalText.replace(/```json/gi, '').replace(/```/g, '').trim();

            // Basic JSON Stitching for multi-batch arrays or objects
            // If the user uploads a huge exam, we might get multiple valid JSON chunks.
            // In a robust system, we would parse each one and merge the objects/arrays.
            // For now, we attempt to parse the entire concatenated string if it's one batch,
            // or return the cleaned string for the frontend/backend to handle.

            // Try to parse just to validate if it's a clean single JSON (common for < 5 pages)
            JSON.parse(cleanJson);
            finalText = cleanJson;
        } catch (e) {
            console.error("[OCR] Failed to parse Gemini output as strict JSON:", e);
            if (isRubric) {
               // We don't fail hard here anymore because a 5-page batch might output multiple JSON blocks.
               // We let the frontend/backend handle the string parsing fallback.
               console.warn("Rubric extraction didn't parse as a single JSON object. Returning text fallback.");
               finalText = textOutputs.join('\n\n').replace(/```json/gi, '').replace(/```/g, '').trim();
            } else {
               // Student text fallback
               finalText = textOutputs.join('\n\n').replace(/```json/gi, '').replace(/```/g, '').trim();
            }
        }

        return NextResponse.json({ success: true, text: finalText });

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}