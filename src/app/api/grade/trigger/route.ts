import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { submissionId } = body;

        if (!submissionId) {
            return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
        }

        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Publish to QStash to securely forward to finalize
        await qstash.publishJSON({
            url: `${baseUrl}/api/grade/finalize`,
            body: { submissionId }
        });

        return NextResponse.json({ success: true, message: "Triggered Map-Reduce via QStash." });
    } catch (error: any) {
        console.error("[QSTASH_TRIGGER_ERROR]", error);
        return NextResponse.json({ error: "Failed to trigger grading" }, { status: 500 });
    }
}
