import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const config = {
  matcher: ['/profile/:path*', '/admin/:path*'],
};

/**
 * Validates the HMAC-SHA256 signature and expiration of the quiz_session cookie.
 * Self-contained to avoid importing 'server-only' or 'next/headers' into middleware.
 */
function verifySessionCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return false;

  const [id, exp, mac] = cookieValue.split('.');
  if (!id || !exp || !mac) return false;

  const expNum = Number(exp);
  if (Number.isNaN(expNum) || expNum < Date.now() / 1000) {
    return false;
  }

  const key = createHmac('sha256', secret).update('quiz-session').digest();
  const expectedMac = createHmac('sha256', key).update(`${id}.${exp}`).digest('base64url');

  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expectedMac);

  if (macBuf.length !== expBuf.length || !timingSafeEqual(macBuf, expBuf)) {
    return false;
  }

  return true;
}

export function middleware(req: NextRequest): NextResponse {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;

  // Defensive static asset exclusions for direct execution / custom runners
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = pathname.startsWith('/profile') || pathname.startsWith('/admin');
  if (!isProtected) {
    return NextResponse.next();
  }

  // Inspect session cookie
  const sessionCookie = req.cookies.get('quiz_session')?.value;
  const isAuthenticated = verifySessionCookie(sessionCookie);

  if (!isAuthenticated) {
    const returnPath = pathname + search;
    const redirectUrl = new URL(`/signin?redirect=${encodeURIComponent(returnPath)}`, req.url);
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  // Authenticated requests proceed. RBAC authorization for /admin/* is enforced by server layouts.
  return NextResponse.next();
}

export default middleware;
