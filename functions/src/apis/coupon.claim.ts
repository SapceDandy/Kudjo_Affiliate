import { Request, Response } from 'express';
import admin from 'firebase-admin';
import QRCode from 'qrcode';
import { generateShortCode, nowIso } from '../utils/shared';

export async function handleCouponClaim(req: Request, res: Response): Promise<void> {
  const { offerId, infId } = req.body as any;
  const offer = await admin.firestore().doc(`offers/${offerId}`).get();
  if (!offer.exists) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const code = generateShortCode(8);
  const url = `${process.env.PUBLIC_URL || 'https://example.com'}/r/${code}`;
  const qrUrl = await QRCode.toDataURL(url);
  const coupon = await admin.firestore().collection('contentCoupons').add({
    bizId: offer.get('bizId'),
    infId,
    offerId,
    code,
    qrUrl,
    singleUse: true,
    status: 'issued',
    rules: offer.get('rules') || {},
    createdAt: nowIso(),
  });
  res.json({ couponId: coupon.id, code, qrUrl });
} 