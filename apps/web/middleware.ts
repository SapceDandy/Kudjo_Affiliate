import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

// Define paths that require admin authentication
const ADMIN_PATHS = ['/control-center', '/api/control-center'];
// Exclude these admin paths from auth check
const PUBLIC_ADMIN_PATHS = ['/control-center/login', '/api/control-center/login'];

// Detect if running in Edge Runtime
const isEdgeRuntime = typeof process.env.NEXT_RUNTIME === 'string' && 
                     process.env.NEXT_RUNTIME === 'edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle redirects for old admin paths
  if (pathname.startsWith('/admin')) {
    const newPath = pathname.replace('/admin', '/control-center');
    return NextResponse.redirect(new URL(newPath, request.url));
  }
  
  // Check if path requires admin authentication
  if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
    // Skip auth check for public admin paths
    if (PUBLIC_ADMIN_PATHS.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }
    
    try {
      // Get admin token from cookie
      const token = request.cookies.get('admin_token')?.value;
      
      if (!token) {
        console.log('No admin token found, redirecting to login');
        return NextResponse.redirect(new URL('/control-center/login', request.url));
      }
      
      // If in Edge Runtime, we can't use crypto for fingerprint comparison
      // Just do basic JWT verification
      if (isEdgeRuntime) {
        // Skip fingerprint check in Edge Runtime
        const secret = process.env.JWT_SECRET || 'kudjo_admin_jwt_secret';
        try {
          const decoded = verify(token, secret) as any;
          if (!decoded.isAdmin) {
            return NextResponse.redirect(new URL('/control-center/login', request.url));
          }
          return NextResponse.next();
        } catch (e) {
          return NextResponse.redirect(new URL('/control-center/login', request.url));
        }
      } else {
        // Full verification with fingerprint in Node.js runtime
        const secret = process.env.JWT_SECRET || 'kudjo_admin_jwt_secret';
        const decoded = verify(token, secret) as any;
        
        // Check if token contains admin claim
        if (!decoded.isAdmin) {
          console.log('Token does not have admin claim');
          return NextResponse.redirect(new URL('/control-center/login', request.url));
        }

        // In development, skip fingerprint enforcement to avoid local IP/header variance
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.next();
        }

        // Generate fingerprint from current request for comparison
        const userAgent = request.headers.get('user-agent') || '';
        const ip = request.headers.get('x-forwarded-for') || request.ip || '';
        const currentFingerprint = Buffer.from(`${userAgent}:${ip}`).toString('base64');
        
        // Compare fingerprints to prevent session hijacking
        if (decoded.fingerprint !== currentFingerprint) {
          console.log('Fingerprint mismatch, possible session hijacking attempt');
          return NextResponse.redirect(new URL('/control-center/login', request.url));
        }
      }
      
      // Token is valid, allow request
      return NextResponse.next();
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return NextResponse.redirect(new URL('/control-center/login', request.url));
    }
  }
  
  // For all other paths, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/control-center/:path*',
    '/business/:path*',
    '/influencer/:path*',
    '/api/admin/:path*',
    '/api/control-center/:path*'
  ],
};
