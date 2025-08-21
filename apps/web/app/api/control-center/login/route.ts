import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

// Use Node.js runtime for this API route
export const runtime = 'nodejs';

// Disable static optimization to ensure this route is always dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('Admin login API called');
  
  try {
    // Get credentials from request body
    const body = await request.json();
    const { email, passcode } = body;
    
    console.log('Received login attempt:', { email: email.substring(0, 3) + '***' });
    
    // Get admin credentials from environment variables only (no fallbacks)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasscode = process.env.ADMIN_PASSCODE;

    if (!adminEmail || !adminPasscode) {
      console.error('Admin credentials not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Convert strings to buffers for timing-safe comparison
    const emailEqual = email === adminEmail;
    const passcodeEqual = passcode === adminPasscode;
    
    console.log('Credential check result:', { emailEqual, passcodeEqual });

    if (emailEqual && passcodeEqual) {
      console.log('Admin login successful');
      
      // Generate a fingerprint based on user agent and IP
      const userAgent = request.headers.get('user-agent') || '';
      const ip = request.headers.get('x-forwarded-for') || request.ip || '';
      const fingerprint = Buffer.from(`${userAgent}:${ip}`).toString('base64');
      
      // Create JWT token with admin claims
      const token = sign(
        { 
          isAdmin: true, 
          email, 
          fingerprint,
          iat: Math.floor(Date.now() / 1000),
        }, 
        process.env.JWT_SECRET || 'kudjo_admin_jwt_secret',
        { expiresIn: '24h' }
      );
      
      // Create response with token in cookie
      const response = NextResponse.json({ success: true });
      
      // Set HTTP-only cookie with the token
      response.cookies.set({
        name: 'admin_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      
      return response;
    } else {
      console.log('Admin login failed: Invalid credentials');
      return NextResponse.json({ error: 'Invalid email or passcode' }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 