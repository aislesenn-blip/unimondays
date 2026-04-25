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

        const { filePath } = await req.json();

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

        let promptContent: any[] = [{ type: "text", text: `Transcribe all handwritten and printed text precisely. Do not summarize. If it's an exam, clearly preserve the question numbers and parts.` }];

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
            model: google('gemini-2.0-flash'),
            messages: [{ role: "user", content: promptContent as any }],
            temperature: 0.0,
        });

        console.log("[OCR] Extraction complete.");

        return NextResponse.json({ success: true, text: text });

    } catch (error: any) {
        console.error("[FATAL-OCR] Extraction failed:", error);
        return NextResponse.json({ error: error.message || 'Failed to extract text.' }, { status: 500 });
    }
}
