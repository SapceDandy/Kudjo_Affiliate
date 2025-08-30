import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');
    if (!offerId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // TODO: Replace with real analytics aggregation
    const data = {
      id: offerId,
      views: 124,
      redemptions: 37,
      payoutCents: 14250,
      series: Array.from({ length: 7 }).map((_, i) => ({ day: i, views: 10 + i * 3, redemptions: 2 + (i % 3) }))
    };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


