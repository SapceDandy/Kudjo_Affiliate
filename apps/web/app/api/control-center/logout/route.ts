import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Specify Node.js runtime for this API route
export const runtime = 'nodejs';

export async function POST() {
  try {
    // Clear the admin session cookie
    const cookieStore = cookies();
    cookieStore.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Logout successful' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 