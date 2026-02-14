import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import { sha256Hex } from '../utils/shared';
import { evaluateRedemption } from '../fraud/rules';

const schema = z.object({
  couponCode: z.string().min(1),
  amountCents: z.number().int().min(1),
  businessId: z.string().min(1),
  locationId: z.string().optional(),
  redemptionMethod: z.enum(['pos', 'online', 'manual']).default('manual'),
  customerInfo: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
  transactionId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  manualOverride: z.boolean().optional(),
});

export async function handleRedemptionProcess(req: Request, res: Response): Promise<void> {
  const body = schema.parse(req.body);
  const user = (req as any).user as { uid: string; role: string } | undefined;

  const db = admin.firestore();

  if (user?.role === 'business') {
    const bizDoc = await db.collection('businesses').doc(body.businessId).get();
    if (!bizDoc.exists) {
      res.status(404).json({ error: 'not_found', message: 'Business not found' });
      return;
    }
    const ownerUid = (bizDoc.data() as any).ownerUid;
    if (ownerUid && ownerUid !== user.uid) {
      res.status(403).json({ error: 'forbidden', message: 'Access denied' });
      return;
    }
  }

  const idemSource = body.transactionId || body.idempotencyKey || `${body.couponCode}:${Math.floor(Date.now() / 60000)}`;
  const redemptionId = sha256Hex(`${body.businessId}:${idemSource}`);

  const redemptionRef = db.collection('redemptions').doc(redemptionId);

  const couponQuery = await db
    .collection('coupons')
    .where('code', '==', body.couponCode)
    .limit(1)
    .get();

  if (couponQuery.empty) {
    res.status(404).json({ error: 'not_found', message: 'Coupon not found' });
    return;
  }

  const couponDoc = couponQuery.docs[0];
  const couponRef = couponDoc.ref;

  const now = new Date();

  // Run fraud evaluation before processing
  const fraudDecision = await evaluateRedemption({
    bizId: body.businessId,
    amount: body.amountCents / 100,
    cardToken: body.customerInfo?.phone || undefined,
    ip: body.customerInfo?.ipAddress || undefined,
    timestamp: now.toISOString(),
  }, db);

  if (fraudDecision.action === 'block') {
    res.status(403).json({
      error: 'fraud_blocked',
      message: 'Redemption blocked by fraud detection',
      reasons: fraudDecision.reasons,
    });
    return;
  }

  const fraudStatus = fraudDecision.action === 'review' ? 'pending_review' : 'payable';

  await db.runTransaction(async (tx) => {
    const [existingRedemption, couponSnap] = await Promise.all([tx.get(redemptionRef), tx.get(couponRef)]);

    if (existingRedemption.exists) {
      return;
    }

    const coupon = couponSnap.data() as any;

    if (coupon.bizId && coupon.bizId !== body.businessId) {
      const err: any = new Error('Coupon not valid for this business');
      err.status = 403;
      err.code = 'forbidden';
      throw err;
    }

    if (coupon.status && coupon.status !== 'active') {
      const err: any = new Error('Coupon not active');
      err.status = 400;
      err.code = 'invalid_state';
      throw err;
    }

    const expiresAt = coupon.expiresAt?.toDate?.() || coupon.deadlineAt?.toDate?.() || coupon.deadlineAt;
    if (expiresAt && new Date(expiresAt) < now) {
      const err: any = new Error('Coupon expired');
      err.status = 400;
      err.code = 'expired';
      throw err;
    }

    const usageCount = Number(coupon.usageCount || 0);
    const maxUses = Number(coupon.maxUses || 1);
    if (usageCount >= maxUses) {
      const err: any = new Error('Coupon usage limit reached');
      err.status = 400;
      err.code = 'usage_limit';
      throw err;
    }

    const discountType = coupon.discountType || 'percentage';
    const discountValue = Number(coupon.discountValue || 0);

    let discountCents = 0;
    if (discountType === 'percentage') {
      discountCents = Math.round((body.amountCents * discountValue) / 100);
      const maxDiscountCents = coupon.maxDiscountCents != null ? Number(coupon.maxDiscountCents) : undefined;
      if (maxDiscountCents != null) discountCents = Math.min(discountCents, maxDiscountCents);
    } else {
      discountCents = discountValue;
    }

    const splitPct = Number(coupon.splitPct || 0);
    const influencerEarningsCents = Math.round((body.amountCents * splitPct) / 100);

    tx.set(redemptionRef, {
      couponId: couponDoc.id,
      couponCode: body.couponCode,
      couponType: coupon.type || null,
      businessId: body.businessId,
      influencerId: coupon.infId || coupon.influencerId || null,
      offerId: coupon.offerId || null,
      amountCents: body.amountCents,
      discountCents,
      influencerEarningsCents,
      splitPct,
      redeemedAt: now,
      redemptionMethod: body.redemptionMethod,
      locationId: body.locationId || null,
      transactionId: body.transactionId || null,
      customerInfo: body.customerInfo || null,
      verifiedBy: user?.uid || null,
      createdAt: now,
      updatedAt: now,
      status: fraudStatus,
      fraudDecision: fraudDecision,
    });

    tx.update(couponRef, {
      usageCount: admin.firestore.FieldValue.increment(1),
      lastUsedAt: now,
      updatedAt: now,
    });

    if (coupon.offerId) {
      tx.set(
        db.collection('offers').doc(String(coupon.offerId)),
        {
          totalRedemptions: admin.firestore.FieldValue.increment(1),
          totalRevenue: admin.firestore.FieldValue.increment(body.amountCents),
          updatedAt: now,
        },
        { merge: true }
      );
    }

    const influencerId = coupon.infId || coupon.influencerId;
    if (influencerId && influencerEarningsCents > 0) {
      const ledgerRef = db.collection('ledgerEntries').doc(`earn_${redemptionId}`);
      const ledgerSnap = await tx.get(ledgerRef);
      if (!ledgerSnap.exists) {
        tx.set(ledgerRef, {
          influencerId,
          type: 'earning',
          amountCents: influencerEarningsCents,
          currency: 'USD',
          description: `Earnings from redemption ${redemptionId}`,
          redemptionId,
          campaignId: coupon.offerId || null,
          businessId: body.businessId,
          runningBalanceCents: 0,
          transactionDate: now,
          createdAt: now,
          createdBy: user?.uid || 'unknown',
        });
      }
    }
  });

  res.json({
    success: true,
    redemptionId,
    earningRecorded: true,
  });
}
