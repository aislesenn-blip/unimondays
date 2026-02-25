import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Check for Session Cookie
  const sessionCookie = request.cookies.get('auth-session');
  const hasSession = !!sessionCookie?.value;

  // 2. Loop Destruction Logic: Handle "Orphaned User" error
  // If user is redirected to /login with error=orphaned, clear the invalid session.
  // This breaks the loop where Middleware redirects to Dashboard but Dashboard redirects back to Login.
  if (pathname === '/login' && searchParams.get('error') === 'orphaned') {
    if (hasSession) {
      // Clear the invalid session cookie
      const response = NextResponse.next();
      response.cookies.delete('auth-session');
      return response;
    }
    return NextResponse.next();
  }

  // 3. Protected Routes Logic
  // Dashboard routes require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 4. Public Routes Logic (Login/Signup/Forgot Password)
  // If authenticated, redirect to Dashboard (unless explicitly logging out or error present)
  // We check for 'error' param to ensure we don't redirect if there's a login error being displayed
  if ((pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password') && hasSession) {
    if (!searchParams.has('error')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
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
     * - auth/error (dedicated error pages if any)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
