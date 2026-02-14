import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

export async function GET() {
  const cookieStore = cookies();
  const adminTokenCookie = cookieStore.get('admin_token');

  if (!adminTokenCookie) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json({ isAdmin: false }, { status: 500 });
    }

    // Verify the token
    const payload = verify(adminTokenCookie.value, jwtSecret) as {
      role: string;
      email: string;
      isAdmin?: boolean;
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
