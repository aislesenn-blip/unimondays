import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth-session');

    // Optionally sign out from Supabase if we had a token, but cookie is our primary session.
    // Since we don't store the access token in the cookie (just userId/email), we can't call signOut(token).
    // The client might have its own session, but for backend auth, clearing the cookie is key.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
