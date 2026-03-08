import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@upstash/qstash";
import { prisma } from '@/lib/prisma';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(req: NextRequest) {
    try {
        const { submissionId } = await req.json();

        if (!submissionId) {
            return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
        }

        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Ensure we only trigger finalize if the submission exists
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId }
        });

        if (!submission) {
             return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        console.log(`[QSTASH] Dispatching finalize task for submission ${submissionId}`);

        await qstash.publishJSON({
            url: `${baseUrl}/api/grade/finalize`,
            body: { submissionId }
        });

        return NextResponse.json({ success: true, message: "Dispatched to QStash successfully" });

    } catch (error: any) {
        console.error("[QSTASH_TRIGGER_ERROR]", error);
        return NextResponse.json({ error: 'Failed to dispatch job to QStash' }, { status: 500 });
    }
}
