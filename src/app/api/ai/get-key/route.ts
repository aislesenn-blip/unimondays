import { NextResponse } from 'next/server';

export async function GET() {
    // Hii inasoma siri moja kwa moja kutoka kwenye Vercel Server Environment.
    // Tumeongeza OPENROUTER_API_KEY ili kuruhusu mfumo mpya kufanya kazi vizuri
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "API Key haijasetiwa kwenye Vercel Server Environment Variables. Hakikisha umeweka OPENROUTER_API_KEY." },
            { status: 500 }
        );
    }

    return NextResponse.json({ key: apiKey });
}
