import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';
    const cookie = request.headers.get('cookie') || '';

    const res = await fetch(`${base}/api/session/me`, {
      method: 'GET',
      headers: { cookie },
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Session me proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
