import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { extractMultiplePageImagesFromBuffer } from '@/lib/pdf-utils';
import { supabase } from '@/lib/supabase'; // Using the admin client

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY || 'dummy' });
export const maxDuration = 300; // Increased to max to prevent premature timeouts during OCR

export const POST = verifySignatureAppRouter(
    async (req: NextRequest) => {
        console.log("[PLAYBOOK-TRACE] [SECURITY] QStash Signature Verified for payload.");
        try {
        const { submissionId, pages, pdfUrl } = await req.json(); // pages is an array: [1, 2, 3, 4]

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
            console.error(`[PLAYBOOK-TRACE] [FATAL-OCR] OpenRouter API Failed. Check API Credits/Network. Reason: ${aiError.message}`);
            throw aiError; // Trigger QStash retry
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