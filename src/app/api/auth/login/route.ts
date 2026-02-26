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
        user = await prisma.user.create({
          data: {
            id: userId,
            email: authData.user.email!,
            role: 'STUDENT',
            fullName: 'Student' // Placeholder until profile update
          }
        });
      } else {
        // Data inconsistency: Auth exists but public user missing.
        // This is an "Orphaned User" scenario.
        console.warn(`[Login] Orphaned User Detected: ${userId} (Email: ${email})`);
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

    // Return the role so frontend can redirect correctly
    return NextResponse.json({ success: true, user: { role: user.role } });

  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
