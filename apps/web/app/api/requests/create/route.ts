import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
    const body = await request.json();
    const { bizId, title, description, splitPct, contentMealCapCents } = body || {};
    if (!bizId || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const id = `req_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    await adminDb.collection('requests').doc(id).set({
      id,
      bizId,
      title,
      description: description || '',
      splitPct: Number(splitPct) || 0,
      contentMealCapCents: Number(contentMealCapCents) || 0,
      status: 'open',
      createdAt: now,
    });
    return NextResponse.json({ id, success: true });
  } catch (e) {
    console.error('Create request error:', e);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}


