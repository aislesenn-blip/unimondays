import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { NextRequest } from 'next/server';
import { User, University } from '@prisma/client';

export type AuthenticatedUser = User & { university: University | null };

/**
 * Validates the session and returns the authenticated user with tenant context.
 * Logs the access attempt for audit purposes.
 */
export async function validateRequest(req?: NextRequest): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('auth-session');

  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(sessionCookie.value);

    // Validate session structure
    if (!session.userId) return null;

    // SAFE SYNC STRATEGY: Avoid 'include' if causing crashes.
    // First, fetch the user.
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) return null;

    // Fetch university separately if ID exists
    let university: University | null = null;
    if (user.universityId) {
        try {
            university = await prisma.university.findUnique({
                where: { id: user.universityId }
            });
        } catch (e) {
            console.error("Failed to fetch university details for user:", user.id, e);
            // Continue without university details rather than crashing auth
        }
    }

    // Combine
    const authenticatedUser: AuthenticatedUser = {
        ...user,
        university
    };

    // Audit Log (Async, don't block)
    // Only log if request object is provided (Client-side usage might not provide it, Server Components neither)
    if (req) {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const path = req.nextUrl.pathname;

        prisma.auditLog.create({
        data: {
            universityId: user.universityId,
            action: 'API_ACCESS',
            details: `Access to ${path}`,
            ipAddress: ip,
            severity: 'INFO'
        }
        }).catch(e => console.error("Audit Log Error:", e));
    }

    return authenticatedUser;
  } catch (error) {
    console.error("Auth Validation Error:", error);
    return null;
  }
}

// Deprecated, use validateRequest
export async function getAuthenticatedUser() {
   // This function is limited as it doesn't have access to Request object for IP logging
   // Use validateRequest instead where possible.
   const cookieStore = await cookies();
   const sessionCookie = cookieStore.get('auth-session');
   if (!sessionCookie) return null;
   try {
     const session = JSON.parse(sessionCookie.value);
     const user = await prisma.user.findUnique({ where: { id: session.userId } });
     return user;
   } catch {
     return null;
   }
}
