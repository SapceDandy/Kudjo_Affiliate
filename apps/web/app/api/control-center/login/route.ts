import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';

    const res = await fetch(`${base}/api/control-center/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Admin login proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}