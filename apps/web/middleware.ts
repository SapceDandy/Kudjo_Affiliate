import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Generate a fingerprint from request data using Web Crypto API
// This is Edge Runtime compatible (no Node.js crypto module)
async function getRequestSignature(request: NextRequest): Promise<string> {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.ip || request.headers.get('x-forwarded-for') || '';
  const data = `${userAgent}:${ip}`;
  
  // Use TextEncoder to convert string to Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Create a digest using SHA-256 (Web Crypto API)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  
  // Handle control-center routes (new admin routes)
  if (url.pathname.startsWith('/control-center') || url.pathname.startsWith('/api/control-center')) {
    // Allow access to login page and its API
    if (url.pathname === '/control-center/login' || url.pathname === '/api/control-center/login') {
      return NextResponse.next();
    }

    // Check for admin session cookie
    const cookie = request.cookies.get('admin_session')?.value;

    if (!cookie) {
      console.log('No admin session cookie found, redirecting to login');
      // Redirect to login with next parameter
      const loginUrl = new URL('/control-center/login', url.origin);
      loginUrl.searchParams.set('next', url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify JWT token
      const { payload } = await jwtVerify(
        cookie, 
        new TextEncoder().encode(process.env.ADMIN_PASSCODE || 'fallback-secret-do-not-use-in-production')
      );

      // Check if token is valid and user is admin
      if (payload.role !== 'admin' || !payload.email) {
        throw new Error('Invalid admin token');
      }

      // Check if email matches admin email from environment
      const adminEmail = process.env.ADMIN_EMAIL;
      if (payload.email !== adminEmail) {
        throw new Error('Admin email mismatch');
      }

      // Get request signature
      const requestSignature = await getRequestSignature(request);
      
      // Add signature to headers to prevent session hijacking
      const response = NextResponse.next();
      response.headers.set('X-Session-Signature', requestSignature);
      
      return response;

    } catch (error) {
      console.error('Admin middleware error:', error);
      
      // Clear invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL('/control-center/login', url.origin));
      response.cookies.delete('admin_session');
      
      return response;
    }
  }
  
  // Handle legacy admin routes - redirect to control-center
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    // Redirect admin routes to control-center
    const newPath = url.pathname.replace(/^\/admin/, '/control-center')
                               .replace(/^\/api\/admin/, '/api/control-center');
    return NextResponse.redirect(new URL(newPath, url.origin));
  }
  
  // Handle business and influencer routes
  if (url.pathname.startsWith('/business') || url.pathname.startsWith('/influencer')) {
    // Check if user is authenticated
    const session = request.cookies.get('session')?.value;
    
    if (!session) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/auth/signin', url.origin));
    }
    
    // Let the page handle role-specific access control
    return NextResponse.next();
  }

  // For all other routes, proceed normally
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
