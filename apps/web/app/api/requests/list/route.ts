import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use admin.firestore() directly to avoid null adminDb issues
    const admin = await import('firebase-admin');
    let dbRef;
    
    if (admin.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kudjo-affiliate';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
      } else {
        try {
          const fs = await import('fs');
          const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
          admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        } catch {
          admin.initializeApp();
        }
      }
    }
    
    dbRef = admin.firestore();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const snap = await dbRef.collection('requests').where('status', '==', status).get();
    const items = snap.docs.map(d => d.data());
    // Enhance with payout and discount info if present on offers
    const enhanced = await Promise.all(items.map(async (r: any) => {
      if (r.offerId) {
        const off = await dbRef.collection('offers').doc(r.offerId).get();
        const o = off.exists ? off.data() : {};
        return { ...r, payoutPerRedemptionCents: o?.payoutPerRedemptionCents || Math.round((o?.splitPct || 0) * 10), userDiscountPct: o?.userDiscountPct || 20 };
      }
      return r;
    }));
    return NextResponse.json({ items: enhanced });
  } catch (e) {
    console.error('List requests error:', e);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}


