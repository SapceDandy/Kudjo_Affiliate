import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { fraudDetection, RedemptionContext } from '@/lib/services/fraud-detection';
import { z } from 'zod';

const validateSchema = z.object({
  couponCode: z.string().min(1),
  amountCents: z.number().min(1),
  businessId: z.string().min(1),
  locationId: z.string().optional(),
  redemptionMethod: z.enum(['pos', 'online', 'manual']),
  customerInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    ipAddress: z.string().optional()
  }).optional(),
  transactionId: z.string().optional()
});

export async function POST(request: NextRequest) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const validatedData = validateSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify business ownership for non-admin users
    if (authResult.user.role === 'business' && authResult.user.businessId !== validatedData.businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create fraud detection context
    const context: RedemptionContext = {
      couponCode: validatedData.couponCode,
      amountCents: validatedData.amountCents,
      businessId: validatedData.businessId,
      locationId: validatedData.locationId,
      customerInfo: validatedData.customerInfo,
      redemptionMethod: validatedData.redemptionMethod,
      timestamp: new Date()
    };

    // Run fraud detection
    const fraudResult = await fraudDetection.checkRedemption(context);

    // Log fraud attempt if blocked or high risk
    if (fraudResult.blocked || fraudResult.riskLevel === 'high') {
      await fraudDetection.logFraudAttempt(context, fraudResult);
    }

    // If blocked, return error
    if (fraudResult.blocked) {
      return NextResponse.json({
        valid: false,
        blocked: true,
        reason: fraudResult.reason,
        fraudScore: fraudResult.score,
        riskLevel: fraudResult.riskLevel
      }, { status: 400 });
    }

    // Get coupon details for response
    const couponSnapshot = await adminDb.collection('coupons')
      .where('code', '==', validatedData.couponCode)
      .limit(1)
      .get();

    if (couponSnapshot.empty) {
      return NextResponse.json({
        valid: false,
        reason: 'Coupon not found'
      }, { status: 404 });
    }

    const coupon = couponSnapshot.docs[0].data();
    const couponId = couponSnapshot.docs[0].id;

    // Calculate discount amount
    let discountCents = 0;
    if (coupon.discountType === 'percentage') {
      discountCents = Math.round((validatedData.amountCents * coupon.discountValue) / 100);
      if (coupon.maxDiscountCents) {
        discountCents = Math.min(discountCents, coupon.maxDiscountCents);
      }
    } else {
      discountCents = coupon.discountValue;
    }

    // Calculate influencer earnings
    const influencerEarningsCents = Math.round((validatedData.amountCents * coupon.splitPct) / 100);

    // Prepare redemption data (but don't save yet - this is just validation)
    const redemptionPreview = {
      couponId,
      couponCode: validatedData.couponCode,
      couponType: coupon.type,
      businessId: validatedData.businessId,
      influencerId: coupon.influencerId,
      offerId: coupon.offerId,
      amountCents: validatedData.amountCents,
      discountCents,
      influencerEarningsCents,
      splitPct: coupon.splitPct,
      redemptionMethod: validatedData.redemptionMethod,
      locationId: validatedData.locationId,
      transactionId: validatedData.transactionId,
      fraudScore: fraudResult.score,
      fraudFlags: fraudResult.flags,
      riskLevel: fraudResult.riskLevel
    };

    return NextResponse.json({
      valid: true,
      coupon: {
        id: couponId,
        code: coupon.code,
        type: coupon.type,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        splitPct: coupon.splitPct,
        usageCount: coupon.usageCount,
        maxUses: coupon.maxUses,
        expiresAt: coupon.expiresAt?.toDate?.()?.toISOString() || coupon.expiresAt
      },
      redemption: {
        amountCents: validatedData.amountCents,
        discountCents,
        finalAmountCents: validatedData.amountCents - discountCents,
        influencerEarningsCents,
        businessNetCents: validatedData.amountCents - discountCents - influencerEarningsCents
      },
      fraud: {
        score: fraudResult.score,
        riskLevel: fraudResult.riskLevel,
        flags: fraudResult.flags,
        requiresManualReview: fraudResult.riskLevel === 'high'
      }
    });

  } catch (error) {
    console.error('Error validating redemption:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate redemption', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Process actual redemption after validation
export async function PUT(request: NextRequest) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { couponCode, amountCents, businessId, locationId, redemptionMethod, customerInfo, transactionId, manualOverride } = body;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Re-validate (in case of time gap between validation and processing)
    const context: RedemptionContext = {
      couponCode,
      amountCents,
      businessId,
      locationId,
      customerInfo,
      redemptionMethod,
      timestamp: new Date()
    };

    const fraudResult = await fraudDetection.checkRedemption(context);

    // Block if fraud detected and no manual override
    if (fraudResult.blocked && !manualOverride) {
      return NextResponse.json({
        success: false,
        blocked: true,
        reason: fraudResult.reason,
        requiresManualOverride: true
      }, { status: 400 });
    }

    // Get coupon
    const couponSnapshot = await adminDb.collection('coupons')
      .where('code', '==', couponCode)
      .limit(1)
      .get();

    if (couponSnapshot.empty) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const couponDoc = couponSnapshot.docs[0];
    const coupon = couponDoc.data();
    const couponId = couponDoc.id;

    // Calculate amounts
    let discountCents = 0;
    if (coupon.discountType === 'percentage') {
      discountCents = Math.round((amountCents * coupon.discountValue) / 100);
      if (coupon.maxDiscountCents) {
        discountCents = Math.min(discountCents, coupon.maxDiscountCents);
      }
    } else {
      discountCents = coupon.discountValue;
    }

    const influencerEarningsCents = Math.round((amountCents * coupon.splitPct) / 100);
    const now = new Date();

    // Create redemption record
    const redemptionData = {
      couponId,
      couponCode,
      couponType: coupon.type,
      businessId,
      influencerId: coupon.influencerId,
      offerId: coupon.offerId,
      amountCents,
      discountCents,
      influencerEarningsCents,
      splitPct: coupon.splitPct,
      redeemedAt: now,
      redemptionMethod,
      locationId: locationId || null,
      transactionId: transactionId || null,
      customerInfo: customerInfo || null,
      fraudScore: fraudResult.score,
      fraudFlags: fraudResult.flags,
      riskLevel: fraudResult.riskLevel,
      manualOverride: manualOverride || false,
      verifiedBy: authResult.user.uid,
      createdAt: now,
      updatedAt: now
    };

    // Use transaction to ensure consistency
    const redemptionRef = adminDb.collection('redemptions').doc();
    const batch = adminDb.batch();

    // Add redemption
    batch.set(redemptionRef, redemptionData);

    // Update coupon usage count
    batch.update(couponDoc.ref, {
      usageCount: (coupon.usageCount || 0) + 1,
      lastUsedAt: now,
      updatedAt: now
    });

    // Update campaign stats
    const campaignRef = adminDb.collection('offers').doc(coupon.offerId);
    batch.update(campaignRef, {
      totalRedemptions: adminDb.FieldValue.increment(1),
      totalRevenue: adminDb.FieldValue.increment(amountCents),
      updatedAt: now
    });

    // Update influencer earnings
    const influencerRef = adminDb.collection('influencers').doc(coupon.influencerId);
    batch.update(influencerRef, {
      totalEarnings: adminDb.FieldValue.increment(influencerEarningsCents),
      totalRedemptions: adminDb.FieldValue.increment(1),
      updatedAt: now
    });

    await batch.commit();

    // Log successful redemption
    if (fraudResult.riskLevel === 'high' || manualOverride) {
      await fraudDetection.logFraudAttempt(context, {
        ...fraudResult,
        blocked: false // Override since it was processed
      });
    }

    return NextResponse.json({
      success: true,
      redemptionId: redemptionRef.id,
      couponCode,
      amountCents,
      discountCents,
      finalAmountCents: amountCents - discountCents,
      influencerEarningsCents,
      businessNetCents: amountCents - discountCents - influencerEarningsCents,
      redeemedAt: now.toISOString(),
      fraud: {
        score: fraudResult.score,
        riskLevel: fraudResult.riskLevel,
        manualOverride: manualOverride || false
      }
    });

  } catch (error) {
    console.error('Error processing redemption:', error);

    return NextResponse.json(
      { error: 'Failed to process redemption', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
