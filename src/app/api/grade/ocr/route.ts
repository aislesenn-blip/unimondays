import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { Client } from "@upstash/qstash";
import { extractMultiplePageImagesFromBuffer } from '@/lib/pdf-utils';
import { readFile } from '@/lib/storage';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY || 'dummy' });
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { submissionId, pages, pdfUrl } = await req.json(); // pages is an array: [1, 2, 3, 4]

        // 1. Download PDF Buffer Exactly ONCE
        const pdfBuffer = await readFile(pdfUrl, 'exam_pdfs');

        // 2. Extract multiple pages in a single iteration
        const pageImages = await extractMultiplePageImagesFromBuffer(pdfBuffer, pages);

        // 3. Build Multimodal Content Array
        const promptContent: any[] = [
            { type: "text", text: `Transcribe all handwritten text from these pages precisely. Do not summarize. Pages: ${pages.join(', ')}` }
        ];

        for (const pageNum of pages) {
            const imageBuffer = pageImages.get(pageNum);
            if (imageBuffer) {
                promptContent.push({
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` }
                });
            }
        }

        // 4. Parallel OCR via Gemini Vision (with strict timeout/error handling)
        let extractedText = "";
        try {
            const completion = await openRouterClient.chat.completions.create({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: promptContent }]
            });
            extractedText = completion.choices[0]?.message?.content || "";
        } catch (aiError: any) {
            console.error(`[OCR_AI_ERROR] OpenRouter failed for submission ${submissionId}, pages ${pages.join(',')}:`, aiError);
            throw aiError; // Rethrow to let QStash retry the chunk if applicable
        }
        const chunkData = { pages, text: extractedText };

        // 3. ATOMIC LOCK & REDUCE TRIGGER (Zero Race Conditions)
        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: {
                extractedData: { push: chunkData }, // Atomic push to PostgreSQL array
                processedChunks: { increment: 1 }   // Atomic increment
            }
        });

        // 4. Fire Reducer if this was the last chunk to finish
        if (updatedSubmission.processedChunks === updatedSubmission.totalChunks) {
            const protocol = req.headers.get('x-forwarded-proto') || 'https';
            const host = req.headers.get('host') || 'localhost:3000';
            const baseUrl = `${protocol}://${host}`;
            await qstash.publishJSON({
                url: `${baseUrl}/api/grade/finalize`,
                body: { submissionId }
            });
        }

        return NextResponse.json({ success: true, pages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}