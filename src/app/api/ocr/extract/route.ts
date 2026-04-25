import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fileTypeFromBuffer } from 'file-type';
import { pdf } from 'pdf-to-img';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Gemini 2.0 requires dropping the openai/ from the base URL for the OpenAI SDK wrapper
// depending on the google library version, or using correct format.
// The error 404 indicates we need just `https://generativelanguage.googleapis.com/v1beta/openai/` with strict model name
// Wait, looking at docs, if we use `ai` sdk Google provider, it's safer. Let's use it.
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/", // Drop /openai/ for native AI SDK
});

export const maxDuration = 300; // 5 minutes max duration for Vercel

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

        // Clean path and download from Supabase
        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);

        if (downloadError || !fileData) {
             throw new Error(`Supabase Download Failed: ${downloadError?.message}`);
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const type = await fileTypeFromBuffer(buffer);
        const mime = type?.mime || 'application/pdf'; // Default to PDF if undetermined

        let promptContent: any[] = [];

        if (isRubric) {
            promptContent.push({
                type: "text",
                text: `You are an expert data structured parser. Your task is to extract a Marking Scheme / Rubric from the provided document images and convert it into a STRICT JSON array.

CRITICAL INSTRUCTIONS:
1. ONLY extract actual questions meant to be graded. Do NOT include page headers, footers, "page markers", or general instructions.
2. If a question has sub-parts (e.g., 1a, 1b), treat each sub-part as a distinct item if they have separate marks. Otherwise, group them logically.
3. You MUST output ONLY valid JSON. No markdown wrappers like \`\`\`json.

The JSON MUST exactly match this format:
[
  {
    "questionId": "string", // Example: "Q1", "1(a)", "Question 2"
    "maxScore": number, // Example: 5, 2.5
    "rubricSegment": "string" // The full detailed explanation of what is required to get the marks.
  }
]
`
            });
        } else {
            promptContent.push({
                type: "text",
                text: `You are an Intelligent Exam Collator. Your task is to read the provided student exam document and output a highly structured, logical text transcription.

CRITICAL INSTRUCTIONS:
1. Extract ALL handwritten and printed text precisely.
2. INTELLIGENT COLLATION: Students often answer questions out of order or across multiple pages. You MUST group all parts of a single question together under a clear header, regardless of which page they appear on.
   - Example: If Q1a is on Page 1 and Q1b is on Page 4, group them together under a "--- QUESTION 1 ---" header.
3. REGISTRATION NUMBER: Extract the student's Registration Number/ID if present and put it clearly at the very top of the output like: "REGISTRATION NUMBER: [ID]"
4. Output cleanly formatted text, do NOT summarize. Do NOT output JSON.`
            });
        }

        if (mime === 'application/pdf') {
            console.log("[OCR] Converting PDF to images...");
            const document = await pdf(buffer, { scale: 1.0 }); // Slightly higher scale since we don't have multiple workers loading it
            let pageCount = 0;
            for await (const imageBuffer of document) {
                promptContent.push({ type: "image", image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` });
                pageCount++;
                // Limit to 20 pages to prevent payload too large errors
                if (pageCount >= 20) break;
            }
            console.log(`[OCR] PDF converted to ${pageCount} images.`);
        } else if (mime.startsWith('image/')) {
            promptContent.push({ type: "image", image: `data:${mime};base64,${buffer.toString('base64')}` });
        } else {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and images are supported.' }, { status: 400 });
        }

        console.log("[OCR] Sending to Gemini...");

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            messages: [{ role: "user", content: promptContent as any }],
            temperature: 0.0,
        });

        console.log("[OCR] Extraction complete.");

        let finalText = text;

        if (isRubric) {
            try {
                // Ensure it's clean JSON by stripping markdown if Gemini disobeys
                const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                JSON.parse(cleanJson); // Validate it parses
                finalText = cleanJson;
            } catch (e) {
                console.error("[OCR] Failed to parse Gemini output as JSON for Rubric:", e);
                return NextResponse.json({ error: 'Failed to structure rubric into JSON.' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, text: finalText });

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}
