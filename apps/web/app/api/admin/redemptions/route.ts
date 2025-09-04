import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ManualRedemptionSchema } from '@/lib/schemas/coupon';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ManualRedemptionSchema.parse(body);
    const { couponCode, amountCents, timestamp, notes } = parsed;

    // Find the coupon
    const couponsQuery = await adminDb!.collection('coupons')
      .where('code', '==', couponCode)
      .limit(1)
      .get();

    if (couponsQuery.empty) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const couponDoc = couponsQuery.docs[0];
    const couponData = couponDoc.data();
    const couponId = couponDoc.id;

    if (couponData.status !== 'active') {
      return NextResponse.json({ error: 'Coupon is not active' }, { status: 400 });
    }

    // Find affiliate link for earnings calculation
    const affiliateLinksQuery = await adminDb!.collection('affiliateLinks')
      .where('couponId', '==', couponId)
      .limit(1)
      .get();

    if (affiliateLinksQuery.empty) {
      return NextResponse.json({ error: 'Affiliate link not found' }, { status: 404 });
    }

    const affiliateLinkDoc = affiliateLinksQuery.docs[0];
    const affiliateLinkData = affiliateLinkDoc.data();
    const affiliateLinkId = affiliateLinkDoc.id;

    // Calculate earnings
    const splitPct = affiliateLinkData.splitPct || 0;
    const earningsCents = Math.round(amountCents * (splitPct / 100));

    const redemptionTimestamp = timestamp || new Date();
    const now = new Date();

    // Create redemption record
    const redemptionRef = adminDb!.collection('redemptions').doc();
    const batch = adminDb!.batch();
    batch.set(redemptionRef, {
      id: nanoid(),
      couponId,
      couponCode,
      affiliateLinkId,
      businessId: couponData.bizId,
      influencerId: couponData.infId,
      orderValueCents: amountCents,
      earningsCents,
      timestamp: redemptionTimestamp,
      notes: notes || '',
      source: 'manual_admin',
      createdAt: now,
      updatedAt: now,
    });

    // Update affiliate link stats
    const affiliateLinkRef = adminDb!.collection('affiliateLinks').doc(affiliateLinkId);
    batch.update(affiliateLinkRef, {
      conversions: (affiliateLinkData.conversions || 0) + 1,
      totalEarnings: (affiliateLinkData.totalEarnings || 0) + earningsCents,
      updatedAt: now
    });

    // Mark coupon as used
    batch.update(couponDoc.ref, {
      status: 'used',
      usedAt: redemptionTimestamp,
      updatedAt: now,
    });

    // Update affiliate link if it's an affiliate coupon
    if (couponData.type === 'AFFILIATE' && couponData.linkId) {
      const linkRef = adminDb!.collection('affiliateLinks').doc(couponData.linkId);
      batch.update(linkRef, {
        conversions: (affiliateLinkData.conversions || 0) + 1,
        updatedAt: now,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      redemption: {
        id: redemptionRef.id,
        couponCode,
        amountCents,
        earningsCents,
        timestamp: redemptionTimestamp,
      },
    });

  } catch (error) {
    console.error('Error creating manual redemption:', error);
    return NextResponse.json(
      { error: 'Failed to create redemption' },
      { status: 500 }
    );
  }
}
