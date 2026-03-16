import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { extractMultiplePageImagesFromBuffer } from '@/lib/pdf-utils';
import { supabase } from '@/lib/supabase'; // Using the admin client
import { fileTypeFromBuffer } from 'file-type';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY || 'dummy' });
export const maxDuration = 300; // Increased to max to prevent premature timeouts during OCR

export const POST = verifySignatureAppRouter(
    async (req: NextRequest) => {
        const startTime = Date.now();
        const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

        console.log("[PLAYBOOK-TRACE] [SECURITY] QStash Signature Verified for payload.");
        try {
        const { submissionId, pages, chunkIndex, pdfUrl } = await req.json();

        if (DEBUG_MODE) {
            console.log(`[DEBUG] [OCR_STAGE] Started OCR for submission ${submissionId}, chunk ${chunkIndex}`);
        }

        // 1. Download PDF Buffer Exactly ONCE using robust Supabase Admin SDK
        // Clean path to ensure it doesn't have leading slashes if it's already a relative storage path
        const cleanPath = pdfUrl?.startsWith('/') ? pdfUrl.slice(1) : pdfUrl;

        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('exam_pdfs')
            .download(cleanPath);

        if (downloadError || !fileData) {
            console.error(`[Storage Error] Failed to download PDF for submission ${submissionId}:`, downloadError);
            throw new Error(`Supabase Download Failed: ${downloadError?.message || 'No data returned'}`);
        }

        // Convert Blob/File to Buffer for your PDF parser
        const arrayBuffer = await fileData.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        // Validating PDF MIME
        const type = await fileTypeFromBuffer(pdfBuffer);
        if (type?.mime !== 'application/pdf') {
            throw new Error('Invalid file type. Only PDFs are allowed.');
        }

        // 2. Extract multiple pages in a single iteration
        const pageImages = await extractMultiplePageImagesFromBuffer(pdfBuffer, pages);

        // 3. Build Multimodal Content Array
        const promptContent: any[] = [
            { type: "text", text: `Transcribe all handwritten and printed text from these pages precisely. Do not summarize. Preserve the exact layout, numbering, and content. Also estimate readability: rate from 0.0 to 1.0 how confident you are that the text is accurate. Include the score explicitly as [CONFIDENCE: X.X]. Pages: ${pages.join(', ')}` }
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
        let confidenceScore = 0.5; // default fallback
        try {
            const completion = await openRouterClient.chat.completions.create({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: promptContent }],
                temperature: 0.0,
                max_tokens: 8192
            });
            extractedText = completion.choices[0]?.message?.content || "";

            // Extract confidence score
            const confidenceMatch = extractedText.match(/\[CONFIDENCE:\s*([\d\.]+)\]/i);
            if (confidenceMatch) {
                confidenceScore = parseFloat(confidenceMatch[1]);
            }
        } catch (aiError: any) {
            console.error(`[PLAYBOOK-TRACE] [FATAL-OCR] OpenRouter API Failed. Check API Credits/Network. Reason: ${aiError.message}`);
            throw aiError; // Trigger QStash retry
        }

        // Idempotent UPSERT to ExtractedChunk table to fix array race condition and dupes
        await prisma.extractedChunk.upsert({
            where: {
                submissionId_chunkIndex: {
                    submissionId: submissionId,
                    chunkIndex: chunkIndex
                }
            },
            update: {
                pages: pages,
                text: extractedText,
                confidence: confidenceScore
            },
            create: {
                submissionId: submissionId,
                chunkIndex: chunkIndex,
                pages: pages,
                text: extractedText,
                confidence: confidenceScore
            }
        });

        if (DEBUG_MODE) {
            const ocrTime = Date.now() - startTime;
            console.log(`[DEBUG] [OCR_STAGE] Chunk ${chunkIndex} completed in ${ocrTime}ms. Text Length: ${extractedText.length}, Confidence: ${confidenceScore}`);
        }

        // Check completion atomically
        const totalChunksRecord = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: { totalChunks: true }
        });
        const currentCount = await prisma.extractedChunk.count({
            where: { submissionId: submissionId }
        });

        // 4. Fire Reducer if this was the last chunk to finish
        if (totalChunksRecord && currentCount === totalChunksRecord.totalChunks) {
            if (DEBUG_MODE) {
                console.log(`[DEBUG] [OCR_STAGE] SUCCESS. All chunks extracted for submission ${submissionId}.`);
                await prisma.systemLog.create({
                    data: {
                        level: 'INFO',
                        message: 'OCR Stage Completed',
                        metadata: JSON.stringify({ submissionId, totalChunks: currentCount })
                    }
                });
            }

            const protocol = req.headers.get('x-forwarded-proto') || 'https';
            const host = req.headers.get('host') || 'localhost:3000';
            const baseUrl = `${protocol}://${host}`;

            // ARCHITECTURE FIX: Option B. Create Job post-OCR, then wake queue.
            await prisma.job.create({
                data: {
                    type: 'AI_GRADE_SUBMISSION',
                    payload: JSON.stringify({ submissionId }),
                    status: 'PENDING',
                    retryCount: 0
                }
            });

            // Detached Wake-Up Ping using QStash to provide valid signatures
            await qstash.publish({ url: `${baseUrl}/api/queue/process` })
                .catch(e => console.error("[OCR_WAKE_ERROR] Failed to ping queue via QStash:", e));
        }

            return NextResponse.json({ success: true, pages });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    },
    {
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || 'dummy_current_key',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || 'dummy_next_key'
    }
);