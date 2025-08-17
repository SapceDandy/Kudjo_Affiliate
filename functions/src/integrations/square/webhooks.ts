import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { evaluateRedemption } from '../../fraud/rules';

export async function handleSquareWebhook(req: Request, res: Response): Promise<void> {
  const eventId = (req.body && req.body.event_id) || (req.headers['x-square-signature'] as string) || `${Date.now()}`;
  const ref = admin.firestore().doc(`webhooks/square/${eventId}`);
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
  const amount = Number(payment?.amount_money?.amount || 0) / 100;
  const cardToken = payment?.card_details?.fingerprint;

  const decision = await evaluateRedemption({ bizId, amount, cardToken, timestamp: new Date().toISOString() });
  await admin.firestore().collection('redemptions').add({
    bizId,
    offerId: payment?.note || 'unknown_offer',
    orderId: payment?.id,
    orderTotal: amount,
    discountAmt: 0,
    netRevenue: amount,
    cardHash: cardToken,
    source: 'affiliate',
    createdAt: new Date().toISOString(),
    decision,
  });
  res.status(200).send('ok');
} 