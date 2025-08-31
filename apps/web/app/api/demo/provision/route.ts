import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAdmin() {
  const admin = await import('firebase-admin');
  if (admin.apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    } else {
      const fs = await import('fs');
      const path = await import('path');
      const candidates = [
        path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
        path.resolve(process.cwd(), 'service-account.json'),
      ];
      let initialized = false;
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const sa = JSON.parse(fs.readFileSync(p, 'utf-8'));
          admin.initializeApp({ credential: admin.credential.cert(sa) });
          initialized = true;
          break;
        }
      }
      if (!initialized) throw new Error('Missing Firebase Admin credentials');
    }
  }
  return admin;
}

export async function POST() {
  try {
    const admin = await getAdmin();
    const db = admin.firestore();
    const auth = admin.auth();

    // Demo identities
    const businessUserId = 'demo_business_user';
    const influencerUserId = 'demo_influencer_user';
    const businessId = businessUserId;
    const influencerId = influencerUserId;
    const businessEmail = 'demo.business@example.com';
    const influencerEmail = 'demo.influencer@example.com';
    const demoPassword = 'demo123';

    // Ensure Auth users
    const ensureUser = async (uid: string, email: string, displayName: string) => {
      try {
        await auth.createUser({ uid, email, password: demoPassword, displayName });
      } catch (e: any) {
        if (e?.code === 'auth/uid-already-exists' || e?.code === 'auth/email-already-exists') {
          // ok
        } else {
          throw e;
        }
      }
    }

    await ensureUser(businessUserId, businessEmail, 'Demo Business');
    await ensureUser(influencerUserId, influencerEmail, 'Demo Influencer');

    const now = new Date().toISOString();
    // Firestore docs
    await db.collection('users').doc(businessUserId).set({ id: businessUserId, email: businessEmail, role: 'business', status: 'active', createdAt: now }, { merge: true });
    await db.collection('businesses').doc(businessId).set({
      id: businessId,
      ownerId: businessUserId,
      name: 'Demo Bistro',
      address: '123 Congress Ave, Austin, TX',
      geo: { lat: 30.2672, lng: -97.7431 },
      defaultSplitPct: 20,
      status: 'active',
      createdAt: now,
    }, { merge: true });

    await db.collection('users').doc(influencerUserId).set({ id: influencerUserId, email: influencerEmail, role: 'influencer', status: 'active', createdAt: now }, { merge: true });
    await db.collection('influencers').doc(influencerId).set({
      id: influencerId,
      ownerId: influencerUserId,
      handle: '@demo_influencer',
      preferredGeo: { lat: 30.28, lng: -97.74 },
      followers: 15000,
      tier: 'Silver',
      status: 'active',
      createdAt: now,
    }, { merge: true });

    // Create multiple demo offers with different discount types
    const demoOffers = [
      {
        id: 'demo_offer_1',
        title: 'First Time Customer - 25% Off Any Entree',
        userDiscountPct: 25,
        splitPct: 20
      },
      {
        id: 'demo_offer_2', 
        title: 'Buy One Get One Free Appetizers',
        userDiscountPct: 50,
        splitPct: 25
      },
      {
        id: 'demo_offer_3',
        title: '$10 Off Your Order',
        userDiscountCents: 1000,
        minSpend: 3000,
        splitPct: 22
      }
    ];

    for (const offer of demoOffers) {
      await db.collection('offers').doc(offer.id).set({
        id: offer.id,
        bizId: businessId,
        title: offer.title,
        description: `Great deal at Demo Bistro`,
        splitPct: offer.splitPct,
        userDiscountPct: offer.userDiscountPct,
        userDiscountCents: offer.userDiscountCents,
        payoutPerRedemptionCents: 400,
        minSpend: offer.minSpend,
        status: 'active',
        active: true,
        createdAt: now,
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      credentials: { businessEmail, influencerEmail, password: demoPassword },
    });
  } catch (e) {
    console.error('Demo provision error:', e);
    return NextResponse.json({ error: 'Provision failed' }, { status: 500 });
  }
}


