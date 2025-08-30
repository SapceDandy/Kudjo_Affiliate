import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const bizId = url.searchParams.get('bizId') || '';
    const infId = url.searchParams.get('infId') || '';
    const base = process.env.FUNCTIONS_URL || 'http://localhost:5001';
    const res = await fetch(`${base}/api/offer.suggest?bizId=${encodeURIComponent(bizId)}&infId=${encodeURIComponent(infId)}`, {
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



