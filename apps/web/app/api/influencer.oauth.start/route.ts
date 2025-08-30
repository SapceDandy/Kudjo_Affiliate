import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || '';
    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';
    const res = await fetch(`${base}/api/influencer.oauth.start?provider=${encodeURIComponent(provider)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const js = await res.json();
    return NextResponse.json(js, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}



