import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Check for Session Cookie
  const sessionCookie = request.cookies.get('auth-session');
  const hasSession = !!sessionCookie?.value;

  let session: any = null;
  if (hasSession) {
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      // Invalid session format
    }
  }

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

  // Student Portal Protection
  if (pathname.startsWith('/student')) {
    // Allow public access to student auth pages
    if (pathname === '/student/login' || pathname === '/student/signup') {
       if (hasSession) {
           // Redirect based on role if already logged in
           const url = request.nextUrl.clone();
           if (session?.role === 'STUDENT') {
               url.pathname = '/student';
           } else {
               url.pathname = '/dashboard';
           }
           return NextResponse.redirect(url);
       }
       return NextResponse.next();
    }

    // Require session for other /student routes
    if (!hasSession) {
        const url = request.nextUrl.clone();
        url.pathname = '/student/login';
        return NextResponse.redirect(url);
    }

    // Enforce Role: Students only
    if (session?.role !== 'STUDENT') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard'; // Redirect lecturers back to their dashboard
        return NextResponse.redirect(url);
    }
  }

  // Lecturer Dashboard Protection
  if (pathname.startsWith('/dashboard')) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Enforce Role: Lecturers only (or admins)
    if (session?.role === 'STUDENT') {
        const url = request.nextUrl.clone();
        url.pathname = '/student';
        return NextResponse.redirect(url);
    }
  }

  // 4. Public Routes Logic (General Login/Signup)
  // These are implicitly for Lecturers/Admins based on current design, or generic entry points.
  if ((pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/') && hasSession) {
    if (!searchParams.has('error')) {
      const url = request.nextUrl.clone();
      if (session?.role === 'STUDENT') {
          url.pathname = '/student';
      } else {
          url.pathname = '/dashboard';
      }
      return NextResponse.redirect(url);
    }
  }

  // 5. Normalization (Redirect /student/dashboard to /student)
  if (pathname === '/student/dashboard') {
      const url = request.nextUrl.clone();
      url.pathname = '/student';
      return NextResponse.redirect(url);
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
