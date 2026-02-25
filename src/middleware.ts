import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static files, images, api routes (except specific ones maybe?), and public pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || // likely a file
    pathname.startsWith('/api/auth') || // Allow auth API calls
    pathname === '/auth-error' // Allow error page access
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('auth-session');
  let session = null;

  if (sessionCookie) {
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      console.error("Middleware: Invalid session cookie", e);
      // If cookie is invalid, treat as logged out? Or maybe delete it?
      // For now, let's treat as null.
    }
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/student');

  // 1. Redirect Loop Protection: Orphaned User Check (Partial)
  // If we are on an auth page but have a session, redirect to appropriate dashboard.
  if (isAuthPage && session) {
    // If we are already redirected from dashboard (e.g. via query param? or just loop), we need to be careful.
    // However, the dashboard should redirect to /auth-error if orphaned, so loop shouldn't happen here.
    // Redirect to role-specific dashboard
    if (session.role === 'STUDENT') {
       return NextResponse.redirect(new URL('/student/dashboard', request.url));
    } else {
       return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 2. Protect Routes
  if (isProtected && !session) {
    // If trying to access protected route without session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Role-Based Access Control (Optional but good)
  // Prevent students from accessing lecturer dashboard
  if (pathname.startsWith('/dashboard') && session && session.role === 'STUDENT') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }
  // Prevent lecturers from accessing student dashboard (if needed, or allow?)
  // Usually strict separation is better.
  if (pathname.startsWith('/student') && session && session.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
