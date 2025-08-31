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
    const couponsQuery = await adminDb.collection('coupons')
      .where('code', '==', couponCode)
      .limit(1)
      .get();

    if (couponsQuery.empty) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const couponDoc = couponsQuery.docs[0];
    const couponData = couponDoc.data();

    if (couponData.status !== 'active') {
      return NextResponse.json({ error: 'Coupon is not active' }, { status: 400 });
    }

    // Get offer details for split calculation
    const offerDoc = await adminDb.collection('offers').doc(couponData.offerId).get();
    if (!offerDoc.exists) {
      return NextResponse.json({ error: 'Associated offer not found' }, { status: 404 });
    }

    const offerData = offerDoc.data()!;
    const splitPct = offerData.splitPct || 20;
    const infEarnings = Math.round(amountCents * (splitPct / 100));

    const redemptionTimestamp = timestamp || new Date();
    const now = new Date();

    // Create redemption record
    const redemptionData = {
      id: nanoid(),
      couponId: couponDoc.id,
      couponCode,
      couponType: couponData.type,
      bizId: couponData.bizId,
      infId: couponData.infId,
      offerId: couponData.offerId,
      orderValueCents: amountCents,
      infEarnings,
      splitPct,
      timestamp: redemptionTimestamp,
      source: 'manual_admin',
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    // Use batch for atomic operations
    const batch = adminDb.batch();

    // Add redemption
    const redemptionRef = adminDb.collection('redemptions').doc();
    batch.set(redemptionRef, redemptionData);

    // Mark coupon as used
    batch.update(couponDoc.ref, {
      status: 'used',
      usedAt: redemptionTimestamp,
      updatedAt: now,
    });

    // Update affiliate link if it's an affiliate coupon
    if (couponData.type === 'AFFILIATE' && couponData.linkId) {
      const linkRef = adminDb.collection('affiliateLinks').doc(couponData.linkId);
      batch.update(linkRef, {
        conversions: adminDb.FieldValue.increment(1),
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
        infEarnings,
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
