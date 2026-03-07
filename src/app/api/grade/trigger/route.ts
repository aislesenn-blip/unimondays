import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Client } from "@upstash/qstash";
import { getPdfPageCount } from '@/lib/pdf-utils';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const CHUNK_SIZE = 4; // Max pages per Gemini Vision request

export async function POST(req: NextRequest) {
    try {
        const { submissionId } = await req.json();
        const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
        if (!submission) throw new Error("Submission not found");

        // 1. Calculate chunks without loading the PDF into memory
        const totalPages = await getPdfPageCount(submission.filePath); // Using filePath since pdfUrl doesn't exist
        const chunks = [];
        for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
            const pageBatch = [];
            for (let j = 0; j < CHUNK_SIZE && (i + j) <= totalPages; j++) {
                pageBatch.push(i + j);
            }
            chunks.push(pageBatch);
        }

        // 2. Initialize Atomic Tracking State
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'PROCESSING',
                totalChunks: chunks.length,
                processedChunks: 0,
                extractedData: []
            }
        });

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

        // 3. Dispatch Parallel Map Jobs to QStash
        const messages = chunks.map(pageBatch => ({
            url: `${baseUrl}/api/grade/ocr`,
            body: { submissionId, pages: pageBatch, pdfUrl: submission.filePath } // Pass filePath
        }));

        // Pass the array DIRECTLY to batchJSON
        await qstash.batchJSON(messages);

        return NextResponse.json({ success: true, message: `Dispatched ${chunks.length} parallel OCR workers.` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}