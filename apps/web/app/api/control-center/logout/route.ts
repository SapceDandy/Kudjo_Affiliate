import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for this API route
export const runtime = 'nodejs';

// Disable static optimization to ensure this route is always dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('Admin logout API called');
  
  // Create response
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  // Clear admin token cookie
  response.cookies.set({
    name: 'admin_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/',
  });
  
  console.log('Admin token cookie cleared');
  return response;
} 