import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { Client } from "@upstash/qstash";
import { extractSinglePageImage } from '@/lib/pdf-utils';

const qstash = new Client({ token: process.env.QSTASH_TOKEN || 'dummy' });
const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY || 'dummy' });
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { submissionId, pages, pdfUrl } = await req.json(); // pages is an array: [1, 2, 3, 4]

        // 1. Build Multimodal Content Array
        const promptContent: any[] = [
            { type: "text", text: `Transcribe all handwritten text from these pages precisely. Do not summarize. Pages: ${pages.join(', ')}` }
        ];

        for (const pageNum of pages) {
            const imageBuffer = await extractSinglePageImage(pdfUrl, pageNum);
            promptContent.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` }
            });
        }

        // 2. Parallel OCR via Gemini Vision
        const completion = await openRouterClient.chat.completions.create({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: promptContent }]
        });

        const extractedText = completion.choices[0]?.message?.content || "";
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
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
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