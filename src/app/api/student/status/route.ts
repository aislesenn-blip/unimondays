import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
        return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    try {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: {
                id: true,
                status: true,
                feedback: true,
                extractedChunks: {
                    select: {
                        chunkIndex: true,
                        pages: true,
                    }
                }
            }
        });

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Calculate progress (this is an estimate based on chunks)
        const totalChunksExtracted = submission.extractedChunks.length;

        let progressMessage = "Initializing...";
        if (submission.status === 'PENDING') {
            if (totalChunksExtracted > 0) {
                progressMessage = `Processing OCR... ${totalChunksExtracted} chunks extracted.`;
            } else {
                progressMessage = "Queued for processing...";
            }
        } else if (submission.status === 'GRADING') {
            progressMessage = "AI Grading in progress...";
        } else if (submission.status === 'GRADED') {
            progressMessage = "Grading complete.";
        } else if (submission.status === 'FAILED' || submission.status === 'REVIEW_NEEDED') {
            progressMessage = "Processing stopped. Review needed.";
        }

        return NextResponse.json({
            status: submission.status,
            progressMessage,
            feedback: submission.feedback,
            chunksProcessed: totalChunksExtracted
        });

    } catch (error: any) {
        console.error("Status check failed:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
