import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

const FUNCTIONS_BASE_URL = process.env.FUNCTIONS_BASE_URL || 'http://localhost:5001/kudjo-affiliate-dev/us-central1/api';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const infId = searchParams.get('infId') || user.uid;

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/influencer/recommendations?infId=${encodeURIComponent(infId)}`, {
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Influencer recommendations proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
