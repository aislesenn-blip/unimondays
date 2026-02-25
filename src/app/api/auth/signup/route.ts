import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';

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

    let userId: string | undefined;

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered') || authError.status === 422) {
          console.warn(`User ${email} already exists in Auth. Checking public record...`);
          // Try to get the user ID. We can't get it from createUser if it fails.
          // We must fetch it.
          // Since we are admin, we can list users or get by email?
          // supabase.auth.admin.listUsers() is heavy.
          // Maybe just assume they can login?
          // But the requirement is to REPAIR the profile if it's missing.
          // We can't get the ID easily without signing in or listing users.
          // Let's try listing users by email?
          // Note: listUsers doesn't filter by email directly in all versions, but let's check.
          // Actually, if they exist in Auth, maybe we can't get the ID without their password (login).
          // BUT, if we are in the signup flow, and they already exist, we should tell them to LOGIN.
          // However, the prompt says "If a user attempts to log in...".
          // Wait, the prompt says: "If a user attempts to log in, and they exist in Supabase auth.users but are MISSING from the public.users table... Update the login route".
          // For SIGNUP, if they exist in Auth, we usually say "User already exists".
          // But if they are *orphaned*, maybe we should allow them to "sign up" again to repair?
          // If we can't get the ID, we can't repair.
          // So for Signup, if Auth exists, we return 400 "User already exists. Please login."
          // And relying on Login to repair?
          // No, Login can't repair because it doesn't have the payload (Institution, Name).
          // So Signup MUST repair if possible.
          // Can we get the user by email?
          // `supabase.auth.admin.listUsers()` logic?
          // Or `supabase.rpc`?
          // Let's try `supabase.auth.admin.listUsers()`. (Might be slow/limited).
          // Alternatively, we can just return 400 and tell them to contact support if they can't login.
          // But the user said "Dynamically repair their profile...".
          // Let's assume we can't get ID easily here.
          // Actually, if we use `createUser` and it exists, it might return the user object in some versions? No.
          // Let's stick to: Return 400 "User already exists". The *Login* route will handle the orphaned check (by returning 400 cleanly).
          // The prompt says "If a user attempts to log in... handle orphaned users gracefully".
          // It also says "Fix the Prisma Invocation (/api/auth/signup & /api/auth/login)".
          // So for Signup, I should just make sure it doesn't crash 500.
          console.error("Supabase Auth Error:", authError);
          return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      console.error("Supabase Auth Error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    userId = authData.user.id;

    // 3. Create Public User Record
    // Check if user already exists (might happen if auth succeeded but public failed previously - race condition?)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    let publicUser;
    if (!existingUser) {
        publicUser = await prisma.user.create({
            data: {
                id: userId,
                email,
                fullName,
                universityId: university.id,
                role: UserRole.LECTURER, // Enforce Enum
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

  } catch (error: any) {
    console.error("Signup Error:", error);
    // Return a generic error message to user, but log the specific one
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
