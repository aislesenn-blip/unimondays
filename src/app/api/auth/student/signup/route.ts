import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
      console.warn("Student Signup Auth Error:", authError.message);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const userId = authData.user.id;

    // 2. Create Public User Record (Prisma)
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    let publicUser;
    if (!existingUser) {
        publicUser = await prisma.user.create({
            data: {
                id: userId,
                email,
                fullName,
                role: 'STUDENT',
            },
        });
    } else {
        publicUser = existingUser;
    }

    // 3. Set Session Cookie
    const sessionData = {
        userId: publicUser.id,
        email: publicUser.email,
        role: publicUser.role
    };

    const cookieStore = await cookies();
    cookieStore.set('auth-session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });

    return NextResponse.json({ success: true, user: publicUser });

  } catch (error: any) {
    console.error("Student Signup Error:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
