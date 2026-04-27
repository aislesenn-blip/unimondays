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
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });

        const { filePath, isRubric } = await req.json();
        if (!filePath) return NextResponse.json({ error: 'No file path provided.' }, { status: 400 });

        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);

        if (downloadError || !fileData) throw new Error(`Supabase Download Failed: ${downloadError?.message}`);

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const type = await fileTypeFromBuffer(buffer);
        const mime = type?.mime || 'application/pdf';

        let promptContent: any[] = [];
        let finalText = "";

        if (isRubric) {
            // RUBRIC INABAKI KAMA ILIVYO (Ni fupi, haina haja ya Batching)
            promptContent.push({
                type: "text",
                text: `You are an elite academic data parser with advanced cognitive reasoning. Your task is to extract a Marking Scheme/Rubric from the provided document images and convert it into a STRICT JSON array.

COGNITIVE DIRECTIVES (USE YOUR INTELLIGENCE):
1. STRUCTURAL AWARENESS: Marking schemes often have complex, nested layouts. Group sub-parts logically into distinct items ONLY if they carry separate marks.
2. CONTEXTUAL ACCURACY: Read the text meticulously. Differentiate between actual scoring criteria and generic document headers/footers.

STRICT BOUNDARIES (DO NOT INVENT):
1. ZERO HALLUCINATION: You are strictly forbidden from inventing, guessing, or estimating numbers.
2. MAX SCORE PRECISION: Extract the \`maxScore\` exactly as written. Pay extreme attention to decimals.
3. NO MARKDOWN: You MUST output ONLY valid JSON. No markdown wrappers like \`\`\`json.

The JSON MUST exactly match this format:
[ { "questionId": "string", "maxScore": number, "rubricSegment": "string" } ]`
            });

            if (mime === 'application/pdf') {
                const document = await pdf(buffer, { scale: 1.0 });
                for await (const imageBuffer of document) {
                    promptContent.push({ type: "image", image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` });
                }
            } else if (mime.startsWith('image/')) {
                promptContent.push({ type: "image", image: `data:${mime};base64,${buffer.toString('base64')}` });
            }

            console.log("[OCR] Extracting Rubric (PRO Model)...");
            const { text } = await generateText({
                model: google('gemini-2.5-pro'),
                messages: [{ role: "user", content: promptContent as any }],
                temperature: 0.0,
            });
            try {
                const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                JSON.parse(cleanJson);
                finalText = cleanJson;
            } catch (e) {
                return NextResponse.json({ error: 'Failed to structure rubric into JSON.' }, { status: 500 });
            }

        } else {
            // 🚨 MTIHANI WA MWANAFUNZI: BATCH PROCESSING ILI KUZUIA TRUNCATION 🚨
            const systemText = `You are a highly intelligent Exam Transcription Engine with advanced cognitive collation abilities. Your task is to extract handwritten and printed text from the provided student exam document pages and construct a perfectly organized, highly readable raw text transcription.

COGNITIVE COLLATION DIRECTIVES (USE YOUR INTELLIGENCE):
1. VISUAL DEMARCATION (CRITICAL): You MUST insert strong visual boundaries between questions to prevent bleeding. Use exact formatting like:
=== QUESTION 1 ===
[Text for Q1]
2. CONTEXTUAL DECIPHERING: Human handwriting can be messy. Use contextual semantic reasoning to decipher sloppy words correctly without altering the student's intended scientific meaning.
3. VISUAL TRANSLATION: Explicitly describe diagrams in text (e.g., "[Student drew a diagram of a plant cell with labels]").

STRICT BOUNDARIES (DO NOT INVENT):
1. ZERO HALLUCINATION: Extract only what the student wrote. Do not correct their factual scientific errors.
2. NO JSON: Output ONLY clean, structured raw text with markdown boundaries.
3. REGISTRATION NUMBER: Find the student's ID/Registration Number and place it prominently at the top.`;

            let allImages: any[] = [];
            if (mime === 'application/pdf') {
                console.log("[OCR] Converting PDF to images...");
                const document = await pdf(buffer, { scale: 1.0 });
                for await (const imageBuffer of document) {
                    allImages.push({ type: "image", image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` });
                }
                console.log(`[OCR] PDF converted to ${allImages.length} images.`);
            } else if (mime.startsWith('image/')) {
                allImages.push({ type: "image", image: `data:${mime};base64,${buffer.toString('base64')}` });
            }

            // Tunakata picha 5 kwa 5 na kuita API
            const BATCH_SIZE = 5;
            for (let i = 0; i < allImages.length; i += BATCH_SIZE) {
                const batchImages = allImages.slice(i, i + BATCH_SIZE);
                console.log(`[OCR] Processing Student Exam Batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(allImages.length/BATCH_SIZE)}...`);

                const { text } = await generateText({
                    model: google('gemini-2.5-pro'), // PRO ONLY
                    messages: [{ role: "user", content: [{ type: "text", text: systemText }, ...batchImages] }],
                    temperature: 0.0,
                });
                finalText += text + "\n\n";
            }
        }

        console.log("[OCR] Extraction complete.");
        return NextResponse.json({ success: true, text: finalText });

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}
