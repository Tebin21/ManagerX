import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, isValidSessionToken } from '@/lib/auth';

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (functionality unchanged —
// see the framework's own upgrade guide). This is only an OPTIMISTIC check
// (cookie signature + expiry, no I/O) — every API route this app exposes
// still re-checks the session itself (lib/auth.ts's hasValidSession), per
// Next.js's own guidance not to rely on proxy as the sole gate.
const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthApi = pathname.startsWith('/api/auth/');
  const isPublicPath = PUBLIC_PATHS.includes(pathname) || isAuthApi;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = isValidSessionToken(token);

  if (!authenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (authenticated && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
