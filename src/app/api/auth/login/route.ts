import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error("Login Auth Error:", authError);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const userId = authData.user.id;

    // 2. Fetch Public User Profile (Safe Sync Strategy)
    // Query ONLY the user ID first, NO includes, to prevent schema mismatch crashes.
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // Data inconsistency: Auth exists but public user missing.
      // This is an "Orphaned User" scenario.
      // Gracefully handle by returning 400, not 500.
      console.warn(`[Login] Orphaned User Detected: ${userId} (Email: ${email})`);

      return NextResponse.json({
        error: 'Account setup incomplete. Please contact support at 0745780988.'
      }, { status: 400 });
    }

    // 3. Set Session Cookie
    const sessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        universityId: user.universityId
    };

    const cookieStore = await cookies();
    cookieStore.set('auth-session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });

    return NextResponse.json({ success: true, user });

  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
