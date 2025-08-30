import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!adminDb) return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await adminDb.collection('coupons').doc(id).set({ status: 'redeemed', used: true, redeemedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to mark used' }, { status: 500 });
  }
}



