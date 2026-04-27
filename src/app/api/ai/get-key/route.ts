import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    // First, check if the user is a logged-in lecturer
    let user = null;
    try {
        user = await getAuthenticatedUser();
    } catch(e) {
        console.warn("Failed lecturer auth check in get-key", e);
    }

    // Second, if not a lecturer, check if it's a student with an active session cookie
    if (!user) {
        try {
            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get('auth-session');
            if (sessionCookie) {
                 const sessionData = JSON.parse(sessionCookie.value);
                 if (sessionData && sessionData.userId) {
                     // We consider them authenticated enough to fetch the key for client processing
                     user = { id: sessionData.userId } as any;
                 }
            }
        } catch(e) {
            console.warn("Failed student auth check in get-key", e);
        }
    }

    // If neither, deny access
    if (!user) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read the hidden key from server environment variables
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "API Key is not configured on the server." },
            { status: 500 }
        );
    }

    return NextResponse.json({ key: apiKey });
}
