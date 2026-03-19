import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { extractMultiplePageImagesFromBuffer } from '@/lib/pdf-utils';
import { supabase } from '@/lib/supabase';
import { fileTypeFromBuffer } from 'file-type';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY || 'dummy' });
export const maxDuration = 300;

export const POST = verifySignatureAppRouter(
    async (req: NextRequest) => {
        try {
            const { submissionId, pages, chunkIndex, pdfUrl } = await req.json();
            const cleanPath = pdfUrl?.startsWith('/') ? pdfUrl.slice(1) : pdfUrl;

            const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);
            if (downloadError || !fileData) throw new Error(`Supabase Download Failed: ${downloadError?.message}`);

            const arrayBuffer = await fileData.arrayBuffer();
            const pdfBuffer = Buffer.from(arrayBuffer);

            const type = await fileTypeFromBuffer(pdfBuffer);
            if (type?.mime !== 'application/pdf') throw new Error('Invalid file type.');

            const pageImages = await extractMultiplePageImagesFromBuffer(pdfBuffer, pages);
            const promptContent: any[] = [{ type: "text", text: `Transcribe all handwritten and printed text precisely. Do not summarize. Include score as [CONFIDENCE: X.X]. Pages: ${pages.join(', ')}` }];

            for (const pageNum of pages) {
                const imageBuffer = pageImages.get(pageNum);
                if (imageBuffer) {
                    promptContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` } });
                }
            }

            let extractedText = "";
            let confidenceScore = 0.5;
            try {
                const completion = await openRouterClient.chat.completions.create({
                    model: "google/gemini-2.5-flash",
                    messages: [{ role: "user", content: promptContent }],
                    temperature: 0.0,
                    max_tokens: 8192
                }, { timeout: 120000 });

                extractedText = completion.choices[0]?.message?.content || "";
                const confidenceMatch = extractedText.match(/\[CONFIDENCE:\s*([\d\.]+)\]/i);
                if (confidenceMatch) confidenceScore = parseFloat(confidenceMatch[1]);
            } catch (aiError: any) {
                console.error(`[FATAL-OCR] OpenRouter API Failed: ${aiError.message}`);
                // L8 MANDATE: Do NOT update DB to FAILED. Throw error to let QStash silently retry.
                throw aiError;
            }

            await prisma.extractedChunk.upsert({
                where: { submissionId_chunkIndex: { submissionId: submissionId, chunkIndex: chunkIndex } },
                update: { pages: pages, text: extractedText, confidence: confidenceScore },
                create: { submissionId: submissionId, chunkIndex: chunkIndex, pages: pages, text: extractedText, confidence: confidenceScore }
            });

            const totalChunksRecord = await prisma.submission.findUnique({ where: { id: submissionId }, select: { totalChunks: true } });
            const currentCount = await prisma.extractedChunk.count({ where: { submissionId: submissionId } });

            if (totalChunksRecord && currentCount === totalChunksRecord.totalChunks) {
                // L8 MANDATE: Atomic Lock prevents duplicate Grading jobs
                const updated = await prisma.submission.updateMany({
                    where: { id: submissionId, status: 'PROCESSING' },
                    data: { status: 'GRADING' }
                });

                if (updated.count > 0) {
                    const protocol = req.headers.get('x-forwarded-proto') || 'https';
                    const host = req.headers.get('host') || 'localhost:3000';
                    const baseUrl = `${protocol}://${host}`;

                    await prisma.job.create({
                        data: { type: 'AI_GRADE_SUBMISSION', payload: JSON.stringify({ submissionId }), status: 'PENDING', retryCount: 0 }
                    });
                    await qstash.publish({ url: `${baseUrl}/api/queue/process` }).catch(()=>null);
                }
            }

            return NextResponse.json({ success: true, pages });
        } catch (error: any) {
            console.error("OCR Route Error:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    },
    { currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || 'dummy_current_key', nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || 'dummy_next_key' }
);