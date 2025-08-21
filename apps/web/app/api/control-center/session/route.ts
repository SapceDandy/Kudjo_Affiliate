import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

// Use Node.js runtime for this API route
export const runtime = 'nodejs';

// Disable static optimization to ensure this route is always dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('Admin session check API called');
  
  try {
    // Get token from cookie
    const token = request.cookies.get('admin_token')?.value;
    
    if (!token) {
      console.log('No admin token found');
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    
    // Verify JWT token
    const secret = process.env.JWT_SECRET || 'kudjo_admin_jwt_secret';
    const decoded = verify(token, secret) as any;
    
    // Check if token contains admin claim
    if (!decoded.isAdmin) {
      console.log('Token does not have admin claim');
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    
    // Generate fingerprint from current request for comparison
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || request.ip || '';
    const currentFingerprint = Buffer.from(`${userAgent}:${ip}`).toString('base64');
    
    // Compare fingerprints to prevent session hijacking
    if (decoded.fingerprint !== currentFingerprint) {
      console.log('Fingerprint mismatch, possible session hijacking attempt');
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    
    // Return admin session data
    return NextResponse.json({
      isAdmin: true,
      email: decoded.email,
      exp: decoded.exp
    }, { status: 200 });
  } catch (error) {
    console.error('Admin session check error:', error);
    return NextResponse.json({ isAdmin: false, error: 'Invalid session' }, { status: 401 });
  }
} 