import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow public response portal
  if (pathname.startsWith('/r/')) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === '/login') {
    // Already logged in → redirect to dashboard
    if (req.auth) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // All other routes require auth
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
