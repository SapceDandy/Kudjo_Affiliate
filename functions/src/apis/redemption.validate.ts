import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const schema = z.object({
  couponCode: z.string().min(1),
  amountCents: z.number().int().min(1),
  businessId: z.string().min(1),
  locationId: z.string().optional(),
  redemptionMethod: z.enum(['pos', 'online', 'manual']).optional(),
  customerInfo: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
  transactionId: z.string().optional(),
});

export async function handleRedemptionValidate(req: Request, res: Response): Promise<void> {
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

  const couponSnap = await db
    .collection('coupons')
    .where('code', '==', body.couponCode)
    .limit(1)
    .get();

  if (couponSnap.empty) {
    res.status(404).json({ valid: false, reason: 'Coupon not found' });
    return;
  }

  const couponDoc = couponSnap.docs[0];
  const coupon = couponDoc.data() as any;

  if (coupon.bizId && coupon.bizId !== body.businessId) {
    res.status(403).json({ valid: false, reason: 'Coupon not valid for this business' });
    return;
  }

  if (coupon.status && coupon.status !== 'active') {
    res.status(400).json({ valid: false, reason: 'Coupon not active' });
    return;
  }

  const expiresAt = coupon.expiresAt?.toDate?.() || coupon.deadlineAt?.toDate?.() || coupon.deadlineAt;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    res.status(400).json({ valid: false, reason: 'Coupon expired' });
    return;
  }

  const usageCount = Number(coupon.usageCount || 0);
  const maxUses = Number(coupon.maxUses || 1);
  if (usageCount >= maxUses) {
    res.status(400).json({ valid: false, reason: 'Coupon usage limit reached' });
    return;
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

  res.json({
    valid: true,
    coupon: {
      id: couponDoc.id,
      code: coupon.code,
      type: coupon.type,
      discountType,
      discountValue,
      splitPct,
      usageCount,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    },
    redemption: {
      amountCents: body.amountCents,
      discountCents,
      finalAmountCents: body.amountCents - discountCents,
      influencerEarningsCents,
      businessNetCents: body.amountCents - discountCents - influencerEarningsCents,
    },
  });
}
