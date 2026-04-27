import { NextResponse } from 'next/server';

export async function GET() {
    // Hii inasoma siri moja kwa moja kutoka kwenye Vercel Server Environment.
    // Muhimu: Ufunguo lazima uitwe GEMINI_API_KEY kule Vercel (bila NEXT_PUBLIC_)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "API Key haijasetiwa kwenye Vercel Server Environment Variables." },
            { status: 500 }
        );
    }

    return NextResponse.json({ key: apiKey });
}
