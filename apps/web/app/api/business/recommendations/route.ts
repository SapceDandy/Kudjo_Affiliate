import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-server';

const FUNCTIONS_BASE_URL = process.env.FUNCTIONS_BASE_URL || 'http://localhost:5001/kudjo-affiliate-dev/us-central1/api';

export async function GET(request: NextRequest) {
  const { user } = await getAuth(request);
  if (!user || (user.role !== 'business' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bizId = searchParams.get('bizId');
  if (!bizId) {
    return NextResponse.json({ error: 'bizId required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/business/recommendations?bizId=${encodeURIComponent(bizId)}`, {
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Business recommendations proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
