import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

// Inline type definitions to avoid import issues
type CouponType = 'AFFILIATE' | 'CONTENT_MEAL';

const ApiCouponCreate = z.object({
  type: z.enum(['AFFILIATE', 'CONTENT_MEAL']),
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
});

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
    const validatedData = ApiCouponCreate.parse(body);
    const { type, bizId, infId, offerId } = validatedData;

    // Fetch business and influencer data for ID generation
    const [bizDoc, infDoc, offerDoc] = await Promise.all([
      getDoc(doc(db, 'businesses', bizId)),
      getDoc(doc(db, 'influencers', infId)),
      getDoc(doc(db, 'offers', offerId))
    ]);

    if (!bizDoc.exists() || !infDoc.exists() || !offerDoc.exists()) {
      return NextResponse.json(
        { error: 'Business, influencer, or offer not found' },
        { status: 404 }
      );
    }

    const business = bizDoc.data();
    const influencer = infDoc.data();
    const offer = offerDoc.data();

    // Generate coupon ID and code
    const couponId = makeDocumentId();
    const code = makePOSCode(type);
    const now = nowIso();

    // Determine tier-based parameters
    let capCents: number | undefined;
    let deadlineAt: string | undefined;

    if (type === 'CONTENT_MEAL') {
      // Content meal coupons have spending caps and 7-day deadlines
      capCents = 5000; // Default $50 cap - should be tier-based
      deadlineAt = addDays(new Date(), 7).toISOString();
    }

    // Create affiliate link if needed
    let linkId: string | undefined;
    if (type === 'AFFILIATE') {
      linkId = makeDocumentId();
      
      const affiliateLink = {
        bizId,
        infId,
        offerId,
        shortCode: makeDocumentId(8),
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${makeDocumentId(8)}`,
        qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${linkId}`,
        status: 'active',
        createdAt: now,
      };

      await setDoc(doc(db, 'affiliateLinks', linkId), affiliateLink);
    }

    // Create coupon document
    const coupon = {
      type,
      bizId,
      infId,
      offerId,
      linkId,
      code,
      status: 'issued',
      cap_cents: capCents,
      deadlineAt,
      createdAt: now,
      admin: {
        posAdded: false,
      },
    };

    // Save coupon to Firestore
    await setDoc(doc(db, 'coupons', couponId), coupon);

    // Return response
    const response: any = {
      couponId,
      code,
      type,
      status: 'issued',
    };

    if (linkId) {
      response.link = {
        linkId,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${makeDocumentId(8)}`,
        qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${linkId}`,
      };
    }

    if (deadlineAt) {
      response.deadlineAt = deadlineAt;
    }

    if (capCents) {
      response.cap_cents = capCents;
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Coupon creation error:', error);
    
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