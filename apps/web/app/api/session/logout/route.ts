import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';
    const cookie = request.headers.get('cookie') || '';

    const res = await fetch(`${base}/api/session/logout`, {
      method: 'POST',
      headers: { cookie },
    });

    const text = await res.text();
    const response = new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) response.headers.set('set-cookie', setCookie);

    return response;
  } catch (error) {
    console.error('Session logout proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
