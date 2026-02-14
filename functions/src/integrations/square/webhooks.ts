import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { evaluateRedemption } from '../../fraud/rules';
import { sha256Hex } from '../../utils/shared';

export async function handleSquareWebhook(req: Request, res: Response): Promise<void> {
  const eventId = (req.body && req.body.event_id) || (req.headers['x-square-signature'] as string) || `${Date.now()}`;
  const db = admin.firestore();
  const ref = db.doc(`webhooks/square/${eventId}`);
  const snap = await ref.get();
  if (snap.exists) {
    res.status(200).send('ok');
    return;
  }

  await ref.set({ receivedAt: admin.firestore.FieldValue.serverTimestamp() });

  const payment = req.body?.data?.object?.payment;
  if (!payment) {
    res.status(200).send('no_payment');
    return;
  }

  const bizId = payment?.location_id || 'unknown_biz';
  const amountCents = Number(payment?.amount_money?.amount || 0);
  const amount = amountCents / 100;
  const cardToken = payment?.card_details?.fingerprint;

  // Match discount codes from payment data to affiliate coupons
  const discounts = payment?.discount_money ? [payment] : [];
  const orderDiscounts = req.body?.data?.object?.order?.discounts || [];
  const allDiscountCodes = [...discounts, ...orderDiscounts]
    .map((d: any) => d.name || d.catalog_object_id || '')
    .filter(Boolean);

  let couponDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let couponData: any = null;

  // Try to match discount codes to affiliate coupons
  for (const code of allDiscountCodes) {
    const couponQuery = await db.collection('coupons')
      .where('code', '==', code)
      .limit(1)
      .get();
    if (!couponQuery.empty) {
      couponDoc = couponQuery.docs[0];
      couponData = couponDoc.data();
      break;
    }
  }

  // Also try payment note as coupon code fallback
  if (!couponDoc && payment?.note) {
    const noteQuery = await db.collection('coupons')
      .where('code', '==', payment.note)
      .limit(1)
      .get();
    if (!noteQuery.empty) {
      couponDoc = noteQuery.docs[0];
      couponData = couponDoc.data();
    }
  }

  const influencerId = couponData?.infId || couponData?.influencerId || null;
  const offerId = couponData?.offerId || payment?.note || 'unknown_offer';

  // Run fraud evaluation
  const decision = await evaluateRedemption({
    bizId,
    amount,
    cardToken,
    timestamp: new Date().toISOString(),
  }, db);

  if (decision.action === 'block') {
    await ref.update({ blocked: true, reasons: decision.reasons });
    res.status(200).send('blocked');
    return;
  }

  const now = new Date();
  const redemptionId = sha256Hex(`${bizId}:${payment?.id || eventId}`);

  // Calculate influencer earnings
  const splitPct = couponData?.splitPct || 0;
  const influencerEarningsCents = Math.round((amountCents * splitPct) / 100);

  // Create redemption document with influencer attribution
  await db.collection('redemptions').doc(redemptionId).set({
    bizId,
    businessId: bizId,
    offerId,
    couponId: couponDoc?.id || null,
    couponCode: couponData?.code || null,
    influencerId,
    orderId: payment?.id,
    orderTotal: amount,
    amountCents,
    discountAmt: 0,
    netRevenue: amount,
    cardHash: cardToken,
    influencerEarningsCents,
    splitPct,
    source: 'square_webhook',
    status: decision.action === 'review' ? 'pending_review' : 'payable',
    decision,
    createdAt: now.toISOString(),
    redeemedAt: now,
  });

  // Create ledger entry for influencer earnings (following redemption.process.ts pattern)
  if (influencerId && influencerEarningsCents > 0 && decision.action === 'allow') {
    const ledgerRef = db.collection('ledgerEntries').doc(`earn_${redemptionId}`);
    const ledgerSnap = await ledgerRef.get();
    if (!ledgerSnap.exists) {
      await ledgerRef.set({
        influencerId,
        type: 'earning',
        amountCents: influencerEarningsCents,
        currency: 'USD',
        description: `Earnings from Square payment ${payment?.id || eventId}`,
        redemptionId,
        campaignId: offerId,
        businessId: bizId,
        runningBalanceCents: 0,
        transactionDate: now,
        createdAt: now,
        createdBy: 'square_webhook',
      });
    }
  }

  // Update coupon usage count
  if (couponDoc) {
    await couponDoc.ref.update({
      usageCount: admin.firestore.FieldValue.increment(1),
      lastUsedAt: now,
      updatedAt: now,
    });
  }

  // Update offer stats
  if (offerId && offerId !== 'unknown_offer') {
    await db.collection('offers').doc(offerId).set(
      {
        totalRedemptions: admin.firestore.FieldValue.increment(1),
        totalRevenue: admin.firestore.FieldValue.increment(amountCents),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  res.status(200).send('ok');
}
