import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, classifyRoute } from '@/lib/rate-limiter';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle redirects for old admin paths
  if (pathname.startsWith('/admin')) {
    const newPath = pathname.replace('/admin', '/control-center');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';
    const bucket = classifyRoute(pathname, request.method);
    const { allowed, retryAfterMs } = checkRateLimit(ip, bucket);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
};
