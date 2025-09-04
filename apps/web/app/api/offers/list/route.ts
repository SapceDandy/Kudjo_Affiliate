import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    // Use admin.firestore() directly to avoid null adminDb issues
    const admin = await import('firebase-admin');
    let dbRef;
    
    if (admin.apps.length === 0) {
      // Initialize Firebase Admin
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kudjo-affiliate';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
      } else {
        // Fallback to local service account or default credentials
        try {
          const fs = await import('fs');
          const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
          admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        } catch {
          admin.initializeApp(); // Use default credentials
        }
      }
    }
    
    dbRef = admin.firestore();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
    const influencerId = searchParams.get('influencerId'); // Get influencer ID for tier-based splits
    // Optional location for client-side filtering
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const mock = searchParams.get('mock') === '1';

    // Get influencer tier if influencerId is provided
    let influencerTier = null;
    if (influencerId) {
      try {
        const influencerDoc = await dbRef.collection('influencers').doc(influencerId).get();
        if (influencerDoc.exists) {
          influencerTier = influencerDoc.data()?.tier;
        }
      } catch (error) {
        console.error('Error fetching influencer tier:', error);
      }
    }

    // Fetch active offers
    const baseQuery = dbRef
      .collection('offers')
      .where('status', '==', 'active');
    const snap = await baseQuery.get();

    let offers = await Promise.all(
      snap.docs.slice(0, limit).map(async (d) => {
        const o = d.data() || {};
        const biz = await dbRef.collection('businesses').doc(o.bizId).get();
        const b = biz.exists ? biz.data() : {};
        
        // Calculate tier-based split percentage
        let splitPct = o.splitPct || 0;
        if (influencerTier && b?.tierDefaults?.[influencerTier]) {
          splitPct = b.tierDefaults[influencerTier].defaultSplit;
        } else if (influencerTier) {
          // Fallback defaults if business hasn't set tier defaults
          const defaultSplits: Record<string, number> = {
            Bronze: 15,
            Silver: 20,
            Gold: 25,
            Platinum: 30
          };
          splitPct = defaultSplits[influencerTier] || 20;
        }
        
        return {
          id: d.id,
          title: o.title,
          description: o.description || '',
          splitPct,
          userDiscountPct: o.userDiscountPct || 20,
          userDiscountCents: o.userDiscountCents || null,
          payoutPerRedemptionCents: o.payoutPerRedemptionCents || Math.round(splitPct * 10),
          bizId: o.bizId,
          businessName: b?.name || o.bizId,
          businessGeo: b?.geo || null,
          status: o.status || 'active',
          active: o.active === true,
        };
      })
    );

    // In mock mode (demo/test), if there are no offers, synthesize from businesses to show UI
    if (mock && offers.length === 0) {
      const bizSnap = await dbRef.collection('businesses').get();
      offers = bizSnap.docs.slice(0, limit).map((b: any) => {
        const bd = b.data() || {};
        
        // Calculate tier-based split for mock offers
        let mockSplitPct = 20;
        if (influencerTier && bd?.tierDefaults?.[influencerTier]) {
          mockSplitPct = bd.tierDefaults[influencerTier].defaultSplit;
        } else if (influencerTier) {
          const defaultSplits: Record<string, number> = {
            Bronze: 15,
            Silver: 20,
            Gold: 25,
            Platinum: 30
          };
          mockSplitPct = defaultSplits[influencerTier] || 20;
        }
        
        return {
          id: `mock_offer_${b.id}`,
          title: `${bd.name || 'Local Business'} Special`,
          description: 'Try our demo campaign!',
          splitPct: mockSplitPct,
          userDiscountPct: 20,
          userDiscountCents: null,
          payoutPerRedemptionCents: mockSplitPct * 10,
          bizId: b.id,
          businessName: bd.name || b.id,
          businessGeo: bd.geo || null,
          status: 'active',
          active: true,
        };
      });
    }

    // Basic offset pagination over the assembled list
    const sliced = offers.slice(offset, offset + limit);
    const nextOffset = offset + limit < offers.length ? offset + limit : null;
    return NextResponse.json({ items: sliced, nextOffset });
  } catch (e) {
    console.error('Offers list error:', e);
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 });
  }
}


