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
2. INTELLIGENT COLLATION (MANDATORY): Do NOT just output page by page. Students often answer questions out of order or scattered across multiple pages. You MUST collate and group all parts of a single question together under a clear, distinct JSON format.
3. REGISTRATION NUMBER: Extract the student's Registration Number/ID if present.
4. Output STRICTLY as a JSON object where keys are the question numbers and values are the full concatenated text of the student's answer for that question.

Example Output format (Strictly JSON, no markdown):
{
  "REGISTRATION_NUMBER": "2018-04-12551",
  "Q1": "Student's full answer for Q1...",
  "Q2": "Student's full answer for Q2..."
}`
            });
        }

        if (mime === 'application/pdf') {
            console.log("[OCR] Converting PDF to images...");
            const document = await pdf(buffer, { scale: 1.0 });
            let pageCount = 0;
            for await (const imageBuffer of document) {
                promptContent.push({ type: "image", image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` });
                pageCount++;
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

        try {
            // Ensure it's clean JSON by stripping markdown if Gemini disobeys
            const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            JSON.parse(cleanJson); // Validate it parses
            finalText = cleanJson;
        } catch (e) {
            console.error("[OCR] Failed to parse Gemini output as JSON:", e);
            if (isRubric) {
               return NextResponse.json({ error: 'Failed to structure rubric into JSON.' }, { status: 500 });
            } else {
               // If student text fails to JSON parse, fallback to raw text (not ideal for pre-chunking, but safe)
               finalText = text;
            }
        }

        return NextResponse.json({ success: true, text: finalText });

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}