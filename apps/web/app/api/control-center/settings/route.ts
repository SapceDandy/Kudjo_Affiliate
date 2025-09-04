import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_PATH = { col: 'system', doc: 'settings' } as const;

export async function GET() {
  try {
    if (!adminDb) return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
    const snap = await adminDb!.collection(SETTINGS_PATH.col).doc(SETTINGS_PATH.doc).get();
    const data = snap.exists ? snap.data() : {};
    return NextResponse.json(data || {}, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!adminDb) return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
    const body = await request.json();
    // Stamp update time
    const payload = { ...body, updatedAt: new Date().toISOString() };
    await adminDb!.collection(SETTINGS_PATH.col).doc(SETTINGS_PATH.doc).set(payload, { merge: true });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}



