import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password, isStudent } = await req.json();

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

    // 2. Fetch Public User Profile
    // SAFE SYNC STRATEGY: Query ONLY the user ID first to avoid relational errors
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      if (isStudent) {
        // Auto-create Student Profile
        // Note: University ID is unknown here. It will be null until they join a class/university via code.
        user = await prisma.user.create({
          data: {
            id: userId,
            email: authData.user.email!,
            role: 'STUDENT',
            fullName: 'Student' // Placeholder
          }
        });
      } else {
        // Data inconsistency: Auth exists but public user missing.
        // This is an "Orphaned User" scenario.
        // Gracefully handle by returning 400, not 500.
        console.warn(`[Login] Orphaned User Detected: ${userId} (Email: ${email})`);

        // We could try to auto-repair if we had university info, but we don't.
        // Return a clean error prompting them to contact support or re-register.
        // If we delete the auth user here, they could re-signup. But that deletes password.
        // Safest: Tell them to contact support.
        return NextResponse.json({
          error: 'Account setup incomplete. Please contact support at 0745780988.'
        }, { status: 400 });
      }
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
