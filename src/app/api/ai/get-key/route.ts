import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (user) {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { openRouterKey: true }
            });
            if (dbUser?.openRouterKey) {
                return NextResponse.json({ key: dbUser.openRouterKey });
            }
        }
    } catch (e) {
        console.warn("Failed to get user for BYOK API Key check", e);
    }

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "API Key is not set on the server." },
            { status: 500 }
        );
    }

    return NextResponse.json({ key: apiKey });
}
