import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!adminDb) return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
    const { id, updates } = await request.json();
    if (!id || typeof updates !== 'object') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    await adminDb.collection('coupons').doc(id).set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}



