import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { NextRequest } from 'next/server';
import { User } from '@prisma/client';

export type AuthenticatedUser = User;

/**
 * Validates the session and returns the authenticated user with tenant context.
 * Logs the access attempt for audit purposes.
 */
export async function validateRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('auth-session');

  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(sessionCookie.value);

    // Validate session structure
    if (!session.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) return null;

    // Audit Log (Async, don't block)
    // In production, use a fire-and-forget queue or specialized logger
    // For now, we write to DB but catch errors to avoid blocking auth
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const path = req.nextUrl.pathname;

    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'API_ACCESS',
        details: `Access to ${path}`,
        ipAddress: ip,
        // userAgent: userAgent, // Removed from schema
        severity: 'INFO'
      }
    }).catch(e => console.error("Audit Log Error:", e));

    return user;
  } catch {
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
     return await prisma.user.findUnique({ where: { id: session.userId } });
   } catch {
     return null;
   }
}
