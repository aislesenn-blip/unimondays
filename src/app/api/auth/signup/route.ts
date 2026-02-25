import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, institutionName } = await req.json();

    if (!email || !password || !fullName || !institutionName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Handle University (Find or Create)
    // Normalize name for search
    const normalizedName = institutionName.trim();
    let university = await prisma.university.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (!university) {
      // Create new university
      // Generate a code based on name (e.g., UOD for University of Dar...)
      const codeBase = normalizedName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
      const code = `${codeBase}-${Math.floor(Math.random() * 10000)}`;

      university = await prisma.university.create({
        data: {
          name: normalizedName,
          code: code,
          domain: `${code.toLowerCase()}.edu`, // Placeholder domain
        },
      });
    }

    // 2. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now to allow immediate login
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      console.error("Supabase Auth Error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const userId = authData.user.id;

    // 3. Create Public User Record
    // Check if user already exists (might happen if auth succeeded but public failed previously)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    let publicUser;
    if (!existingUser) {
        publicUser = await prisma.user.create({
            data: {
                id: userId,
                email,
                fullName,
                universityId: university.id,
                role: 'LECTURER', // Default to Lecturer for signup flow
                tier: 'Lite',
                quota: 100,
            },
        });
    } else {
        publicUser = existingUser;
    }

    // 4. Set Session Cookie
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

  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
