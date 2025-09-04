import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CouponCreateSchema, CouponCreateResponse } from '@/lib/schemas/coupon';
import { shouldUseMockData } from '@/lib/mock-data';

// Inline type definitions to avoid import issues
type CouponType = 'AFFILIATE' | 'CONTENT_MEAL';

// Utility functions
function makeDocumentId(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function makePOSCode(type: CouponType): string {
  const prefix = type === 'AFFILIATE' ? 'A' : 'M';
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parsed = CouponCreateSchema.parse(body);
    let { type, bizId, infId, offerId, override } = parsed;

    // Return mock coupon if quota exceeded or in development
    if (shouldUseMockData()) {
      const mockCouponId = makeDocumentId();
      const mockCode = makePOSCode(type);
      
      const response: CouponCreateResponse = {
        couponId: mockCouponId,
        code: mockCode,
        qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${mockCouponId}`,
        ...(type === 'AFFILIATE' ? { link: {
          linkId: makeDocumentId(),
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${makeDocumentId(8)}`,
          qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${makeDocumentId()}`,
        } } : {}),
      };
      
      return NextResponse.json(response);
    }

    // Initialize Firebase Admin directly to avoid null adminDb issues
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

    // If offerId not provided, derive or create one based on business + influencer
    let offer: any = null;
    if (offerId) {
      const offerDoc = await dbRef.collection('offers').doc(offerId).get();
      if (!offerDoc.exists) {
        return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
      }
      offer = offerDoc.data();
      if (bizId === 'lookup-from-offer' || bizId === 'temp') {
        bizId = (offer as any).bizId;
      }
    }
    const [bizDoc, infDoc] = await Promise.all([
      dbRef.collection('businesses').doc(bizId).get(),
      dbRef.collection('influencers').doc(infId).get(),
    ]);

    if (!bizDoc.exists || !infDoc.exists) {
      return NextResponse.json(
        { error: 'Business or influencer not found' },
        { status: 404 }
      );
    }

    const business = bizDoc.data();
    const influencer = infDoc.data();

    // Check if assignment already exists for this offer+influencer pair
    const assignmentId = `off_${offerId}__inf_${infId}`;
    const assignmentDoc = await dbRef.collection('offer_assignments').doc(assignmentId).get();
    
    if (!assignmentDoc.exists && !override) {
      return NextResponse.json(
        { error: 'No active assignment found for this offer and influencer' },
        { status: 400 }
      );
    }
    
    // Enforce cooldown: one promotion per (bizId, infId) per cooldownDays unless override allowed
    const cooldownDays = Number(business?.cooldownDays ?? 30);
    const allowMultiple = Boolean(business?.allowMultiplePromos);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cooldownDays);
    if (!allowMultiple && !override) {
      try {
        // Fetch most recent coupon for this assignment and check date window
        const recentSnap = await dbRef
          .collection('coupons')
          .where('assignmentId', '==', assignmentId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        const recent = recentSnap.docs[0]?.data() as any | undefined;
        if (recent?.createdAt) {
          const lastCreatedAt = new Date(recent.createdAt);
          if (!isNaN(lastCreatedAt.getTime()) && lastCreatedAt > cutoff) {
            return NextResponse.json(
              { error: `Cooldown active. Next coupon allowed after ${new Date(cutoff).toISOString().slice(0,10)}` },
              { status: 429 }
            );
          }
        }
      } catch (e) {
        // If query fails due to missing index, fail safe by allowing admin override only
        return NextResponse.json({ error: 'Creation temporarily blocked by policy (override required)' }, { status: 429 });
      }
    }

    // Auto-create offer if missing
    if (!offer) {
      const autoOfferId = `${bizId}_${infId}`;
      offerId = autoOfferId;
      await dbRef.collection('offers').doc(offerId).set({
        id: offerId,
        bizId,
        title: `${business?.name || bizId} x ${influencer?.handle || infId}`,
        description: 'Auto-generated offer',
        splitPct: business?.defaultSplitPct ?? 20,
        publicCode: `${(business?.name || 'BIZ').toString().toUpperCase().replace(/\s+/g, '-')}-${Math.floor(Math.random()*1000)}`,
        startAt: nowIso(),
        status: 'active',
        createdAt: nowIso(),
      }, { merge: true });
    }

    // Generate coupon ID and code with uniqueness constraints
    const couponId = makeDocumentId();
    // Code uniqueness: AFFILIATE unique globally; CONTENT_MEAL unique per (biz,inf)
    let code = '';
    for (let attempts = 0; attempts < 5; attempts++) {
      const baseCode = makePOSCode(type);
      const candidate = type === 'AFFILIATE'
        ? baseCode
        : `${baseCode.slice(0,1)}${(bizId+infId).slice(0,3).toUpperCase()}${baseCode.slice(-4)}`;
      // Check uniqueness
      const existing = await (
        type === 'AFFILIATE'
          ? dbRef.collection('coupons').where('code', '==', candidate)
          : dbRef.collection('coupons')
              .where('bizId', '==', bizId)
              .where('infId', '==', infId)
              .where('type', '==', 'CONTENT_MEAL')
              .where('code', '==', candidate)
      ).get();
      if (existing.empty) { code = candidate; break; }
    }
    if (!code) {
      return NextResponse.json({ error: 'Failed to generate unique coupon code' }, { status: 500 });
    }
    const now = nowIso();

    // Determine tier-based parameters
    let capCents: number | undefined;
    let deadlineAt: string | undefined;

    if (type === 'CONTENT_MEAL') {
      // Content meal coupons have spending caps and 7-day deadlines
      capCents = 5000; // Default $50 cap - should be tier-based
      deadlineAt = addDays(new Date(), 7).toISOString();
    }

    // Create affiliate link if needed (using v2 schema)
    let linkToken: string | undefined;
    if (type === 'AFFILIATE') {
      linkToken = makeDocumentId(8);
      
      const affiliateLink = {
        id: linkToken,
        assignmentId,
        urlToken: linkToken,
        status: 'active',
        destinationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/offer/${offerId}?i=${infId}`,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${linkToken}`,
        utm: {
          source: 'kudjo',
          medium: 'affiliate',
          campaign: offerId
        },
        businessId: bizId,
        influencerId: infId,
        offerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await dbRef.collection('affiliate_links').doc(linkToken).set(affiliateLink);
      
      // Update assignment with affiliate link reference
      await dbRef.collection('offer_assignments').doc(assignmentId).set({
        tracking: {
          affiliateLinkId: linkToken
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Create coupon document (v2 schema)
    const coupon = {
      id: couponId,
      type,
      businessId: bizId,
      influencerId: infId,
      offerId,
      assignmentId,
      code,
      status: 'ACTIVE',
      capCents,
      deadline: deadlineAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      posAdded: false,
      usageCount: 0
    };

    // Save coupon to Firestore and update assignment tracking
    await dbRef.collection('coupons').doc(couponId).set(coupon);
    
    // Update assignment with coupon reference
    await dbRef.collection('offer_assignments').doc(assignmentId).set({
      tracking: {
        couponId
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Return response
    const response: CouponCreateResponse = {
      couponId,
      code,
      qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${couponId}`,
      ...(type === 'AFFILIATE' && linkToken ? { link: {
        linkId: linkToken,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${linkToken}`,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${linkToken}`,
      } } : {}),
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Coupon creation error:', error);
    // Handle quota exceeded errors with mock data fallback
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      console.log('Quota exceeded, returning mock coupon');
      
      const body = await request.json();
      const { type } = body;
      const mockCouponId = makeDocumentId();
      const mockCode = makePOSCode(type);
      
      const response: CouponCreateResponse = {
        couponId: mockCouponId,
        code: mockCode,
        qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${mockCouponId}`,
        ...(type === 'AFFILIATE' ? { link: {
          linkId: makeDocumentId(),
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${makeDocumentId(8)}`,
          qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${makeDocumentId()}`,
        } } : {}),
      };
      
      return NextResponse.json(response);
    }
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 