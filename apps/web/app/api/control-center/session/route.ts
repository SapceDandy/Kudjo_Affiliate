import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for this API route
export const runtime = 'nodejs';

// Disable static optimization to ensure this route is always dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';
    const cookie = request.headers.get('cookie') || '';

    const res = await fetch(`${base}/api/session/me`, {
      method: 'GET',
      headers: {
        cookie,
      },
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    if (json.ok === true && json.role === 'admin') {
      return NextResponse.json({ isAdmin: true }, { status: 200 });
    }

    return NextResponse.json({ isAdmin: false }, { status: 403 });
  } catch (error) {
    console.error('Admin session check error:', error);
    return NextResponse.json({ isAdmin: false, error: 'Invalid session' }, { status: 401 });
  }
} 