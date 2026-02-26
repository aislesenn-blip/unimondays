import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Get Session
  const sessionCookie = request.cookies.get('auth-session');
  let session: any = null;

  if (sessionCookie?.value) {
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      // Invalid cookie
    }
  }

  const hasSession = !!session;

  // 2. Loop Destruction Logic: Handle "Orphaned User" error
  if (pathname === '/login' && searchParams.get('error') === 'orphaned') {
    if (hasSession) {
      const response = NextResponse.next();
      response.cookies.delete('auth-session');
      return response;
    }
    return NextResponse.next();
  }

  // 3. Protected Routes Logic

  // A. Lecturer Dashboard (/dashboard)
  // Strictly prevent Students
  if (pathname.startsWith('/dashboard')) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (session.role === 'STUDENT') {
       const url = request.nextUrl.clone();
       url.pathname = '/student/dashboard';
       return NextResponse.redirect(url);
    }
  }

  // B. Student Dashboard (/student/dashboard)
  // Strictly prevent Lecturers (optional but cleaner)
  if (pathname.startsWith('/student/dashboard')) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/student/login';
      return NextResponse.redirect(url);
    }
    if (session.role === 'LECTURER' || session.role === 'ADMIN') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }
  }

  // 4. Public Routes Logic (Login/Signup/Forgot Password)
  // If authenticated, redirect to appropriate Dashboard
  if ((pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/student/login') && hasSession) {
    if (!searchParams.has('error')) {
      const url = request.nextUrl.clone();
      // Redirect based on role
      if (session.role === 'STUDENT') {
          url.pathname = '/student/dashboard';
      } else {
          url.pathname = '/dashboard';
      }
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
