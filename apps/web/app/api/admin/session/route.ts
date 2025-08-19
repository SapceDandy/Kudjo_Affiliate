import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

export async function GET() {
  const cookieStore = cookies();
  const adminSessionCookie = cookieStore.get('admin_session');
  
  if (!adminSessionCookie) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
  
  try {
    // Get the secret key from environment variables
    const jwtSecret = process.env.ADMIN_PASSCODE;
    
    if (!jwtSecret) {
      console.error('Admin JWT secret not configured');
      return NextResponse.json({ isAdmin: false }, { status: 500 });
    }
    
    // Verify the token
    const payload = verify(adminSessionCookie.value, jwtSecret) as {
      role: string;
      email: string;
    };
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    
    return NextResponse.json({
      isAdmin: true,
      email: payload.email,
    });
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
} 