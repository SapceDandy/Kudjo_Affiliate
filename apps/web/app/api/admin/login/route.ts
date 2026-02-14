import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';

// Timing-safe comparison to prevent timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function POST(request: NextRequest) {
  try {
    const { email, passcode } = await request.json();

    // Validate input
    if (!email || !passcode) {
      return NextResponse.json(
        { error: 'Email and passcode are required' },
        { status: 400 }
      );
    }

    // Get environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasscode = process.env.ADMIN_PASSCODE;
    const jwtSecret = process.env.JWT_SECRET;

    // Check if environment variables are set
    if (!adminEmail || !adminPasscode) {
      console.error('Admin credentials not configured');
      return NextResponse.json(
        { error: 'Admin authentication not configured' },
        { status: 500 }
      );
    }

    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server authentication not configured' },
        { status: 500 }
      );
    }

    // Validate credentials using timing-safe comparison
    if (!timingSafeCompare(email, adminEmail) || !timingSafeCompare(passcode, adminPasscode)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token with isAdmin flag for getAuth() detection
    const token = sign(
      {
        role: 'admin',
        isAdmin: true,
        email: adminEmail,
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // Set secure cookie using unified name 'admin_token'
    const cookieStore = cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
