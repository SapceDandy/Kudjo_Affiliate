import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, context: { params: { userId: string } }) {
  try {
    const userId = context.params.userId;
    const updates = await req.json().catch(() => ({}));

    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';
    const cookie = req.headers.get('cookie') || '';
    const authorization = req.headers.get('authorization') || '';

    const res = await fetch(`${base}/api/control-center/users/update`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify({ id: userId, updates }),
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
    console.error('Admin user update proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
